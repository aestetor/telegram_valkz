from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.core.constants import (
    AGE_RANGES,
    FAVORITE_MODES,
    GOALS,
    MICROPHONE_REQUIREMENTS,
    MICROPHONE_VALUES,
    PLAY_TIMES,
    RANKS,
    REPORT_REASONS,
    ROLES,
    SEARCH_STATUSES,
    TEAM_FORMATS,
    TEAM_GOALS,
)
from app.models import PlayerInvite, Profile, Report, Team, TeamApplication, TeamMember, User, UserBlock
from app.schemas import (
    ApplicationCreate,
    InviteCreate,
    OptionsOut,
    PlayerInviteOut,
    ProfileOut,
    ProfileUpdate,
    ReportCreate,
    TeamApplicationOut,
    TeamCreate,
    TeamOut,
    TeamUpdate,
)
from app.services.filtering import profile_matches_filters, team_matches_filters
from app.services.notifications import send_tg_message
from app.services.profile_service import attach_completion, is_profile_complete, profile_match_score, team_match_score

router = APIRouter()

INVITE_DAILY_LIMIT = 20
APPLICATION_DAILY_LIMIT = 10
REPEAT_COOLDOWN = timedelta(hours=24)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def profile_to_response(profile: Profile | None, include_contacts: bool = True) -> dict | None:
    if profile is None:
        return None
    attach_completion(profile)
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "user": profile.user if include_contacts else None,
        "valorant_nickname": profile.valorant_nickname,
        "riot_id": profile.riot_id if include_contacts else "",
        "rank": profile.rank,
        "roles": profile.roles,
        "city": profile.city,
        "age_range": profile.age_range,
        "microphone": profile.microphone,
        "favorite_modes": profile.favorite_modes,
        "goals": profile.goals,
        "about": profile.about,
        "is_visible": profile.is_visible,
        "status": profile.status,
        "search_status": profile.search_status,
        "completion_percent": getattr(profile, "completion_percent", None),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


async def expire_pending_invites(session: SessionDep) -> None:
    result = await session.execute(
        select(PlayerInvite).where(
            PlayerInvite.status == "pending",
            PlayerInvite.expires_at.is_not(None),
            PlayerInvite.expires_at <= utc_now(),
        )
    )
    expired_invites = result.scalars().all()
    if not expired_invites:
        return
    for invite in expired_invites:
        invite.status = "expired"
    await session.commit()


async def ensure_daily_limit(session: SessionDep, model: type, field, user_id: int, max_count: int, message: str) -> None:
    since = utc_now() - timedelta(hours=24)
    result = await session.execute(
        select(func.count()).select_from(model).where(field == user_id, model.created_at >= since)
    )
    if (result.scalar_one() or 0) >= max_count:
        raise HTTPException(status_code=429, detail=message)


async def get_my_profile(session: SessionDep, user_id: int) -> Profile | None:
    result = await session.execute(
        select(Profile).options(selectinload(Profile.user)).where(Profile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        attach_completion(profile)
    return profile


async def ensure_complete_profile(session: SessionDep, user_id: int) -> Profile:
    profile = await get_my_profile(session, user_id)
    if not is_profile_complete(profile):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Сначала заполни анкету")
    return profile


async def ensure_no_block(session: SessionDep, blocker_id: int, blocked_user_id: int) -> None:
    result = await session.execute(
        select(UserBlock).where(
            or_(
                and_(UserBlock.blocker_id == blocker_id, UserBlock.blocked_user_id == blocked_user_id),
                and_(UserBlock.blocker_id == blocked_user_id, UserBlock.blocked_user_id == blocker_id),
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Пользователь недоступен")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/options", response_model=OptionsOut)
async def options() -> OptionsOut:
    return OptionsOut(
        ranks=RANKS,
        roles=ROLES,
        microphone_values=MICROPHONE_VALUES,
        favorite_modes=FAVORITE_MODES,
        goals=GOALS,
        age_ranges=AGE_RANGES,
        play_times=PLAY_TIMES,
        team_goals=TEAM_GOALS,
        team_formats=TEAM_FORMATS,
        microphone_requirements=MICROPHONE_REQUIREMENTS,
        search_statuses=SEARCH_STATUSES,
        report_reasons=REPORT_REASONS,
    )


@router.get("/me/profile", response_model=ProfileOut | None)
async def read_my_profile(session: SessionDep, user: CurrentUserDep) -> Profile | None:
    return await get_my_profile(session, user.id)


@router.put("/me/profile", response_model=ProfileOut)
async def upsert_my_profile(payload: ProfileUpdate, session: SessionDep, user: CurrentUserDep) -> Profile:
    profile = await get_my_profile(session, user.id)
    data = payload.model_dump()

    if profile is None:
        profile = Profile(user_id=user.id, **data)
        profile.status = "active" if profile.is_visible else "hidden"
        session.add(profile)
    else:
        for key, value in data.items():
            setattr(profile, key, value)
        profile.status = "active" if profile.is_visible else "hidden"

    await session.commit()
    await session.refresh(profile)
    result = await session.execute(
        select(Profile).options(selectinload(Profile.user)).where(Profile.id == profile.id)
    )
    return attach_completion(result.scalar_one())


@router.get("/profiles", response_model=list[ProfileOut])
async def list_profiles(
    session: SessionDep,
    user: CurrentUserDep,
    rank: str | None = None,
    role: str | None = None,
    city: str | None = None,
    microphone: str | None = None,
    mode: str | None = None,
    goal: str | None = None,
    age_range: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
) -> list[dict]:
    viewer_profile = await ensure_complete_profile(session, user.id)
    result = await session.execute(
        select(Profile)
        .options(selectinload(Profile.user))
        .where(Profile.user_id != user.id, Profile.is_visible.is_(True), Profile.status == "active")
        .order_by(Profile.updated_at.desc())
        .limit(200)
    )
    profiles = [attach_completion(profile) for profile in result.scalars().all()]
    filtered = [
        profile
        for profile in profiles
        if profile_matches_filters(profile, rank, role, city, microphone, mode, goal, age_range)
    ]
    filtered.sort(key=lambda profile: profile_match_score(profile, viewer_profile), reverse=True)
    return [profile_to_response(profile, include_contacts=False) for profile in filtered[:limit]]


@router.post("/profiles/{profile_id}/invites", response_model=PlayerInviteOut)
async def create_player_invite(
    profile_id: int,
    payload: InviteCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> dict:
    await expire_pending_invites(session)
    await ensure_complete_profile(session, user.id)
    await ensure_daily_limit(
        session,
        PlayerInvite,
        PlayerInvite.from_user_id,
        user.id,
        INVITE_DAILY_LIMIT,
        "Лимит приглашений на сегодня исчерпан",
    )
    result = await session.execute(
        select(Profile).where(Profile.id == profile_id, Profile.is_visible.is_(True), Profile.status == "active")
    )
    target_profile = result.scalar_one_or_none()
    if target_profile is None:
        raise HTTPException(status_code=404, detail="Игрок не найден")
    if target_profile.user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя пригласить самого себя")
    await ensure_no_block(session, user.id, target_profile.user_id)

    existing = await session.execute(
        select(PlayerInvite).where(
            PlayerInvite.from_user_id == user.id,
            PlayerInvite.to_user_id == target_profile.user_id,
            PlayerInvite.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Приглашение уже отправлено")

    recent = await session.execute(
        select(PlayerInvite).where(
            PlayerInvite.from_user_id == user.id,
            PlayerInvite.to_user_id == target_profile.user_id,
            PlayerInvite.created_at >= utc_now() - REPEAT_COOLDOWN,
        )
    )
    if recent.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Повторное приглашение можно отправить через 24 часа")

    invite = PlayerInvite(
        from_user_id=user.id,
        to_user_id=target_profile.user_id,
        message=payload.message,
        expires_at=utc_now() + REPEAT_COOLDOWN,
    )
    session.add(invite)
    await session.commit()
    await session.refresh(invite)

    from_profile = await get_my_profile(session, user.id)
    target_profile = await get_my_profile(session, target_profile.user_id)

    settings = get_settings()
    notif = f"🎮 Приглашение от <b>{from_profile.valorant_nickname if from_profile else 'Игрок'}</b>"
    if invite.message:
        notif += f"\n💬 «{invite.message[:200]}»"
    notif += "\n\nОткрой Valorant LFG → Найти игрока → Входящие приглашения."
    if target_profile and target_profile.user:
        await send_tg_message(settings.bot_token, target_profile.user.telegram_id, notif)

    return {
        "id": invite.id,
        "from_user_id": invite.from_user_id,
        "to_user_id": invite.to_user_id,
        "message": invite.message,
        "status": invite.status,
        "from_profile": profile_to_response(from_profile, include_contacts=False),
        "to_profile": profile_to_response(target_profile, include_contacts=False),
        "created_at": invite.created_at,
        "updated_at": invite.updated_at,
        "expires_at": invite.expires_at,
    }


@router.get("/me/player-invites", response_model=list[PlayerInviteOut])
async def list_player_invites(
    session: SessionDep,
    user: CurrentUserDep,
    direction: str = Query(default="incoming", pattern="^(incoming|outgoing)$"),
) -> list[dict]:
    await expire_pending_invites(session)
    field = PlayerInvite.to_user_id if direction == "incoming" else PlayerInvite.from_user_id
    result = await session.execute(select(PlayerInvite).where(field == user.id).order_by(PlayerInvite.created_at.desc()))
    invites = result.scalars().all()

    output: list[dict] = []
    for invite in invites:
        include_contacts = invite.status == "accepted"
        from_profile = await get_my_profile(session, invite.from_user_id)
        to_profile = await get_my_profile(session, invite.to_user_id)
        output.append(
            {
                "id": invite.id,
                "from_user_id": invite.from_user_id,
                "to_user_id": invite.to_user_id,
                "message": invite.message,
                "status": invite.status,
                "from_profile": profile_to_response(from_profile, include_contacts=include_contacts),
                "to_profile": profile_to_response(to_profile, include_contacts=include_contacts),
                "created_at": invite.created_at,
                "updated_at": invite.updated_at,
                "expires_at": invite.expires_at,
            }
        )
    return output


@router.post("/player-invites/{invite_id}/{action}", response_model=PlayerInviteOut)
async def respond_player_invite(
    invite_id: int,
    action: str,
    session: SessionDep,
    user: CurrentUserDep,
) -> dict:
    await expire_pending_invites(session)
    if action not in {"accept", "reject", "cancel"}:
        raise HTTPException(status_code=400, detail="Unknown action")
    result = await session.execute(select(PlayerInvite).where(PlayerInvite.id == invite_id))
    invite = result.scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")

    if action in {"accept", "reject"} and invite.to_user_id != user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if action == "cancel" and invite.from_user_id != user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if invite.status != "pending":
        detail = "Приглашение истекло" if invite.status == "expired" else "Приглашение уже обработано"
        raise HTTPException(status_code=400, detail=detail)

    invite.status = {"accept": "accepted", "reject": "rejected", "cancel": "cancelled"}[action]
    await session.commit()
    await session.refresh(invite)

    include_contacts = invite.status == "accepted"
    from_profile = await get_my_profile(session, invite.from_user_id)
    to_profile = await get_my_profile(session, invite.to_user_id)

    settings = get_settings()
    if action == "accept" and from_profile and from_profile.user:
        recipient_name = to_profile.valorant_nickname if to_profile else "Игрок"
        await send_tg_message(
            settings.bot_token,
            from_profile.user.telegram_id,
            f"✅ <b>{recipient_name}</b> принял(а) приглашение!\nОткрой Valorant LFG → Найти игрока для связи.",
        )
    elif action == "reject" and from_profile and from_profile.user:
        recipient_name = to_profile.valorant_nickname if to_profile else "Игрок"
        await send_tg_message(
            settings.bot_token,
            from_profile.user.telegram_id,
            f"❌ <b>{recipient_name}</b> отклонил(а) приглашение.",
        )

    return {
        "id": invite.id,
        "from_user_id": invite.from_user_id,
        "to_user_id": invite.to_user_id,
        "message": invite.message,
        "status": invite.status,
        "from_profile": profile_to_response(from_profile, include_contacts),
        "to_profile": profile_to_response(to_profile, include_contacts),
        "created_at": invite.created_at,
        "updated_at": invite.updated_at,
        "expires_at": invite.expires_at,
    }


@router.get("/teams", response_model=list[TeamOut])
async def list_teams(
    session: SessionDep,
    user: CurrentUserDep,
    rank_range: str | None = None,
    role: str | None = None,
    city: str | None = None,
    format: str | None = None,
    mode: str | None = None,
    microphone_requirement: str | None = None,
    goal: str | None = None,
    play_time: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
) -> list[Team]:
    viewer_profile = await ensure_complete_profile(session, user.id)
    result = await session.execute(
        select(Team)
        .options(selectinload(Team.captain))
        .where(Team.is_visible.is_(True), Team.status == "active")
        .order_by(Team.updated_at.desc())
        .limit(200)
    )
    teams = result.scalars().all()
    filtered = [
        team
        for team in teams
        if team_matches_filters(
            team,
            rank_range,
            role,
            city,
            format,
            mode,
            microphone_requirement,
            goal,
            play_time,
        )
    ]
    filtered.sort(key=lambda team: team_match_score(team, viewer_profile), reverse=True)
    return filtered[:limit]


@router.post("/teams", response_model=TeamOut)
async def create_team(payload: TeamCreate, session: SessionDep, user: CurrentUserDep) -> Team:
    profile = await ensure_complete_profile(session, user.id)
    team = Team(captain_id=user.id, **payload.model_dump())
    session.add(team)
    await session.flush()
    member = TeamMember(team_id=team.id, user_id=user.id, role=(profile.roles or [None])[0], is_captain=True)
    session.add(member)
    await session.commit()
    result = await session.execute(select(Team).options(selectinload(Team.captain)).where(Team.id == team.id))
    return result.scalar_one()


@router.get("/teams/{team_id}", response_model=TeamOut)
async def read_team(team_id: int, session: SessionDep, user: CurrentUserDep) -> Team:
    result = await session.execute(select(Team).options(selectinload(Team.captain)).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    if team.captain_id != user.id and (not team.is_visible or team.status in {"hidden", "moderation", "blocked"}):
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return team


@router.put("/teams/{team_id}", response_model=TeamOut)
async def update_team(team_id: int, payload: TeamUpdate, session: SessionDep, user: CurrentUserDep) -> Team:
    result = await session.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    if team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="Только капитан может редактировать команду")
    for key, value in payload.model_dump().items():
        setattr(team, key, value)
    await session.commit()
    result = await session.execute(select(Team).options(selectinload(Team.captain)).where(Team.id == team.id))
    return result.scalar_one()


@router.get("/me/team", response_model=TeamOut | None)
async def read_my_team(session: SessionDep, user: CurrentUserDep) -> Team | None:
    result = await session.execute(
        select(Team)
        .options(selectinload(Team.captain))
        .where(Team.captain_id == user.id)
        .order_by(Team.created_at.desc())
    )
    return result.scalars().first()


@router.post("/teams/{team_id}/apply", response_model=TeamApplicationOut)
async def apply_to_team(
    team_id: int,
    payload: ApplicationCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> dict:
    profile = await ensure_complete_profile(session, user.id)
    result = await session.execute(select(Team).options(selectinload(Team.captain)).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if team is None or not team.is_visible or team.status != "active":
        raise HTTPException(status_code=404, detail="Команда не найдена")
    if team.current_players_count >= 5:
        team.status = "closed"
        await session.commit()
        raise HTTPException(status_code=400, detail="Команда уже заполнена")
    if team.captain_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя откликнуться в свою команду")
    await ensure_no_block(session, user.id, team.captain_id)
    await ensure_daily_limit(
        session,
        TeamApplication,
        TeamApplication.user_id,
        user.id,
        APPLICATION_DAILY_LIMIT,
        "Лимит заявок на сегодня исчерпан",
    )

    member_result = await session.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user.id)
    )
    if member_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ты уже в этой команде")

    existing = await session.execute(
        select(TeamApplication).where(
            TeamApplication.team_id == team_id,
            TeamApplication.user_id == user.id,
            TeamApplication.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Заявка уже отправлена")

    recent = await session.execute(
        select(TeamApplication).where(
            TeamApplication.team_id == team_id,
            TeamApplication.user_id == user.id,
            TeamApplication.created_at >= utc_now() - REPEAT_COOLDOWN,
        )
    )
    if recent.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Повторную заявку можно отправить через 24 часа")

    captain_telegram_id = team.captain.telegram_id
    team_name = team.name
    applicant_nickname = profile.valorant_nickname
    applicant_rank = profile.rank
    applicant_city = profile.city

    application = TeamApplication(team_id=team_id, user_id=user.id, message=payload.message)
    session.add(application)
    await session.commit()
    await session.refresh(application)

    settings = get_settings()
    notif = (
        f"🔔 Новая заявка в команду <b>{team_name}</b>\n"
        f"👤 {applicant_nickname} — {applicant_rank}, {applicant_city}"
    )
    if application.message:
        notif += f"\n💬 «{application.message[:200]}»"
    notif += "\n\nОткрой Valorant LFG → Найти команду, чтобы принять или отклонить."
    await send_tg_message(settings.bot_token, captain_telegram_id, notif)

    return {
        "id": application.id,
        "team_id": application.team_id,
        "user_id": application.user_id,
        "message": application.message,
        "status": application.status,
        "team": team,
        "profile": profile_to_response(profile, include_contacts=False),
        "created_at": application.created_at,
        "updated_at": application.updated_at,
    }


@router.get("/me/team-applications", response_model=list[TeamApplicationOut])
async def list_team_applications(session: SessionDep, user: CurrentUserDep) -> list[dict]:
    result = await session.execute(
        select(TeamApplication)
        .join(Team, Team.id == TeamApplication.team_id)
        .options(selectinload(TeamApplication.team).selectinload(Team.captain))
        .where(Team.captain_id == user.id)
        .order_by(TeamApplication.created_at.desc())
    )
    applications = result.scalars().all()
    output: list[dict] = []
    for application in applications:
        include_contacts = application.status == "accepted"
        profile = await get_my_profile(session, application.user_id)
        output.append(
            {
                "id": application.id,
                "team_id": application.team_id,
                "user_id": application.user_id,
                "message": application.message,
                "status": application.status,
                "team": application.team,
                "profile": profile_to_response(profile, include_contacts=include_contacts),
                "created_at": application.created_at,
                "updated_at": application.updated_at,
            }
        )
    return output


@router.post("/team-applications/{application_id}/{action}", response_model=TeamApplicationOut)
async def respond_team_application(
    application_id: int,
    action: str,
    session: SessionDep,
    user: CurrentUserDep,
) -> dict:
    if action not in {"accept", "reject", "cancel"}:
        raise HTTPException(status_code=400, detail="Unknown action")
    result = await session.execute(
        select(TeamApplication)
        .options(
            selectinload(TeamApplication.team).selectinload(Team.captain),
            selectinload(TeamApplication.user),
        )
        .where(TeamApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if action in {"accept", "reject"} and application.team.captain_id != user.id:
        raise HTTPException(status_code=403, detail="Только капитан может обработать заявку")
    if action == "cancel" and application.user_id != user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if application.status != "pending":
        raise HTTPException(status_code=400, detail="Заявка уже обработана")

    applicant_telegram_id = application.user.telegram_id
    team_name_cached = application.team.name

    next_status = {"accept": "accepted", "reject": "rejected", "cancel": "cancelled"}[action]
    existing_member = None
    if action == "accept":
        member_result = await session.execute(
            select(TeamMember).where(
                TeamMember.team_id == application.team_id,
                TeamMember.user_id == application.user_id,
            )
        )
        existing_member = member_result.scalar_one_or_none()
        if existing_member is None and application.team.current_players_count >= 5:
            application.team.status = "closed"
            await session.commit()
            raise HTTPException(status_code=400, detail="Команда уже заполнена")

    application.status = next_status
    if action == "accept":
        if existing_member is None:
            applicant_profile = await get_my_profile(session, application.user_id)
            member = TeamMember(
                team_id=application.team_id,
                user_id=application.user_id,
                role=(applicant_profile.roles or [None])[0] if applicant_profile else None,
                is_captain=False,
            )
            session.add(member)
            application.team.current_players_count = min(5, application.team.current_players_count + 1)
            application.team.needed_players_count = max(0, application.team.needed_players_count - 1)
        if application.team.current_players_count >= 5:
            application.team.status = "closed"
    await session.commit()
    await session.refresh(application)

    settings = get_settings()
    if action == "accept":
        await send_tg_message(
            settings.bot_token,
            applicant_telegram_id,
            f"✅ Заявку в команду <b>{team_name_cached}</b> приняли!\nОткрой Valorant LFG для связи с капитаном.",
        )
    elif action == "reject":
        await send_tg_message(
            settings.bot_token,
            applicant_telegram_id,
            f"❌ Заявку в команду <b>{team_name_cached}</b> отклонили. Ищи другую команду в приложении.",
        )

    profile = await get_my_profile(session, application.user_id)
    include_contacts = application.status == "accepted"
    return {
        "id": application.id,
        "team_id": application.team_id,
        "user_id": application.user_id,
        "message": application.message,
        "status": application.status,
        "team": application.team,
        "profile": profile_to_response(profile, include_contacts=include_contacts),
        "created_at": application.created_at,
        "updated_at": application.updated_at,
    }


@router.post("/reports")
async def create_report(payload: ReportCreate, session: SessionDep, user: CurrentUserDep) -> dict[str, str]:
    if payload.reported_user_id is not None:
        result = await session.execute(select(User).where(User.id == payload.reported_user_id))
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Игрок не найден")
        if payload.reported_user_id == user.id:
            raise HTTPException(status_code=400, detail="Нельзя пожаловаться на себя")
    if payload.team_id is not None:
        result = await session.execute(select(Team).where(Team.id == payload.team_id))
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Команда не найдена")
    report = Report(reporter_id=user.id, **payload.model_dump())
    session.add(report)
    await session.commit()
    return {"status": "created"}
