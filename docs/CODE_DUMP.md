# Code Dump

Полная выгрузка кода проекта в markdown. Этот файл можно отправить новому ИИ, чтобы он видел весь код без архива.

## File index

- `.env.example`
- `README.md`
- `apps/backend/Dockerfile`
- `apps/backend/app/__init__.py`
- `apps/backend/app/api/__init__.py`
- `apps/backend/app/api/deps.py`
- `apps/backend/app/api/routes.py`
- `apps/backend/app/core/__init__.py`
- `apps/backend/app/core/config.py`
- `apps/backend/app/core/constants.py`
- `apps/backend/app/core/telegram_auth.py`
- `apps/backend/app/db/__init__.py`
- `apps/backend/app/db/base.py`
- `apps/backend/app/db/session.py`
- `apps/backend/app/main.py`
- `apps/backend/app/models/__init__.py`
- `apps/backend/app/models/entities.py`
- `apps/backend/app/schemas/__init__.py`
- `apps/backend/app/schemas/base.py`
- `apps/backend/app/seed.py`
- `apps/backend/app/services/__init__.py`
- `apps/backend/app/services/filtering.py`
- `apps/backend/app/services/profile_service.py`
- `apps/backend/requirements.txt`
- `apps/bot/Dockerfile`
- `apps/bot/app/__init__.py`
- `apps/bot/app/config.py`
- `apps/bot/app/main.py`
- `apps/bot/requirements.txt`
- `apps/web/index.html`
- `apps/web/package.json`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/components/PlayersPage.tsx`
- `apps/web/src/components/ProfilePage.tsx`
- `apps/web/src/components/TeamsPage.tsx`
- `apps/web/src/components/ui.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/telegram.ts`
- `apps/web/src/types.ts`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `docker-compose.yml`

---


## `.env.example`

```dotenv
# Telegram
BOT_TOKEN=123456:change_me
MINI_APP_URL=https://your-domain.com

# Backend
API_HOST=0.0.0.0
API_PORT=8000
API_PUBLIC_URL=https://api.your-domain.com
DATABASE_URL=sqlite+aiosqlite:///./valorant_lfg.db
AUTH_DISABLED=true
CORS_ORIGINS=http://localhost:5173,https://your-domain.com

# Web
VITE_API_URL=http://localhost:8000

```


## `README.md`

```markdown
# Valorant LFG Telegram Mini App

Каркас Telegram Mini App для Valorant-сообщества: анкета, поиск команды и поиск игрока.

## Что внутри

- `apps/bot` — Telegram bot на aiogram 3. Он отправляет кнопку открытия Mini App.
- `apps/backend` — FastAPI API, Telegram initData auth, SQLAlchemy async models.
- `apps/web` — React + Vite Mini App интерфейс.

## Быстрый локальный запуск

1. Скопируй `.env.example` в `.env` и заполни `BOT_TOKEN`.
2. Для локальной разработки можно оставить `AUTH_DISABLED=true`.
3. Запусти backend:

```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

4. Запусти frontend:

```bash
cd apps/web
npm install
npm run dev
```

5. Запусти bot:

```bash
cd apps/bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## Продакшен-логика

В продакшене поставь:

```env
AUTH_DISABLED=false
DATABASE_URL=postgresql+asyncpg://valorant:valorant@postgres:5432/valorant_lfg
MINI_APP_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
```

Mini App должен открываться по HTTPS URL. Backend проверяет Telegram `initData` через HMAC и берет пользователя из Telegram WebApp данных.

## Реализовано

- Главный экран Mini App: Анкета, Найти команду, Найти игрока, Помощь, Настройки.
- Анкета: создание, редактирование, видимость, прогресс заполнения, preview, Riot ID validation.
- Найти команду: список, фильтры, карточка, создание команды, заявка в команду, принятие/отклонение.
- Найти игрока: список, фильтры, подробная карточка, приглашение, входящие/исходящие, принятие/отклонение.
- Модели БД под будущие жалобы и блокировки.

## Следующие шаги

- Доработать разделы `Помощь` и `Настройки`.
- Добавить админ-панель.
- Добавить миграции Alembic.
- Добавить нормальную систему уведомлений через bot из backend.
- Добавить rate limit на заявки и инвайты.

```


## `apps/backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

```


## `apps/backend/app/__init__.py`

```python

```


## `apps/backend/app/api/__init__.py`

```python

```


## `apps/backend/app/api/deps.py`

```python
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.telegram_auth import TelegramAuthError, TelegramUserData, validate_init_data
from app.db.session import get_session
from app.models import User

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user(
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
    x_telegram_init_data: Annotated[str | None, Header()] = None,
    x_debug_telegram_id: Annotated[str | None, Header()] = None,
    x_debug_username: Annotated[str | None, Header()] = None,
) -> User:
    settings = get_settings()

    if settings.auth_disabled:
        tg = TelegramUserData(
            telegram_id=int(x_debug_telegram_id or 1001),
            username=x_debug_username or "dev_user",
            first_name="Dev",
        )
    else:
        init_data = x_telegram_init_data
        if authorization and authorization.lower().startswith("tma "):
            init_data = authorization[4:]
        try:
            tg = validate_init_data(init_data or "", settings.bot_token)
        except TelegramAuthError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    result = await session.execute(select(User).where(User.telegram_id == tg.telegram_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            telegram_id=tg.telegram_id,
            username=tg.username,
            first_name=tg.first_name,
            last_name=tg.last_name,
        )
        session.add(user)
    else:
        user.username = tg.username
        user.first_name = tg.first_name
        user.last_name = tg.last_name

    await session.commit()
    await session.refresh(user)

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is banned")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]

```


## `apps/backend/app/api/routes.py`

```python
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUserDep, SessionDep
from app.core.constants import (
    AGE_RANGES,
    FAVORITE_MODES,
    GOALS,
    MICROPHONE_REQUIREMENTS,
    MICROPHONE_VALUES,
    PLAY_TIMES,
    RANKS,
    ROLES,
    TEAM_FORMATS,
    TEAM_GOALS,
)
from app.models import PlayerInvite, Profile, Report, Team, TeamApplication, TeamMember, UserBlock
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
from app.services.profile_service import attach_completion, is_profile_complete, profile_match_score

router = APIRouter()


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
) -> list[Profile]:
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
    return filtered[:limit]


@router.post("/profiles/{profile_id}/invites", response_model=PlayerInviteOut)
async def create_player_invite(
    profile_id: int,
    payload: InviteCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> dict:
    await ensure_complete_profile(session, user.id)
    result = await session.execute(select(Profile).where(Profile.id == profile_id, Profile.is_visible.is_(True)))
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

    invite = PlayerInvite(
        from_user_id=user.id,
        to_user_id=target_profile.user_id,
        message=payload.message,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    session.add(invite)
    await session.commit()
    await session.refresh(invite)

    from_profile = await get_my_profile(session, user.id)
    target_profile = await get_my_profile(session, target_profile.user_id)
    return {
        "id": invite.id,
        "from_user_id": invite.from_user_id,
        "to_user_id": invite.to_user_id,
        "message": invite.message,
        "status": invite.status,
        "from_profile": from_profile,
        "to_profile": target_profile,
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
    field = PlayerInvite.to_user_id if direction == "incoming" else PlayerInvite.from_user_id
    result = await session.execute(select(PlayerInvite).where(field == user.id).order_by(PlayerInvite.created_at.desc()))
    invites = result.scalars().all()

    output: list[dict] = []
    for invite in invites:
        from_profile = await get_my_profile(session, invite.from_user_id)
        to_profile = await get_my_profile(session, invite.to_user_id)
        output.append(
            {
                "id": invite.id,
                "from_user_id": invite.from_user_id,
                "to_user_id": invite.to_user_id,
                "message": invite.message,
                "status": invite.status,
                "from_profile": from_profile,
                "to_profile": to_profile,
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
        raise HTTPException(status_code=400, detail="Приглашение уже обработано")

    invite.status = {"accept": "accepted", "reject": "rejected", "cancel": "cancelled"}[action]
    await session.commit()
    await session.refresh(invite)

    return {
        "id": invite.id,
        "from_user_id": invite.from_user_id,
        "to_user_id": invite.to_user_id,
        "message": invite.message,
        "status": invite.status,
        "from_profile": await get_my_profile(session, invite.from_user_id),
        "to_profile": await get_my_profile(session, invite.to_user_id),
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
    await ensure_complete_profile(session, user.id)
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
    if team.captain_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя откликнуться в свою команду")

    existing = await session.execute(
        select(TeamApplication).where(
            TeamApplication.team_id == team_id,
            TeamApplication.user_id == user.id,
            TeamApplication.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Заявка уже отправлена")

    application = TeamApplication(team_id=team_id, user_id=user.id, message=payload.message)
    session.add(application)
    await session.commit()
    await session.refresh(application)

    return {
        "id": application.id,
        "team_id": application.team_id,
        "user_id": application.user_id,
        "message": application.message,
        "status": application.status,
        "team": team,
        "profile": profile,
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
        profile = await get_my_profile(session, application.user_id)
        output.append(
            {
                "id": application.id,
                "team_id": application.team_id,
                "user_id": application.user_id,
                "message": application.message,
                "status": application.status,
                "team": application.team,
                "profile": profile,
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
        .options(selectinload(TeamApplication.team).selectinload(Team.captain))
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

    application.status = {"accept": "accepted", "reject": "rejected", "cancel": "cancelled"}[action]
    if action == "accept":
        member = TeamMember(team_id=application.team_id, user_id=application.user_id, is_captain=False)
        session.add(member)
        application.team.current_players_count = min(5, application.team.current_players_count + 1)
    await session.commit()
    await session.refresh(application)
    profile = await get_my_profile(session, application.user_id)
    return {
        "id": application.id,
        "team_id": application.team_id,
        "user_id": application.user_id,
        "message": application.message,
        "status": application.status,
        "team": application.team,
        "profile": profile,
        "created_at": application.created_at,
        "updated_at": application.updated_at,
    }


@router.post("/reports")
async def create_report(payload: ReportCreate, session: SessionDep, user: CurrentUserDep) -> dict[str, str]:
    report = Report(reporter_id=user.id, **payload.model_dump())
    session.add(report)
    await session.commit()
    return {"status": "created"}

```


## `apps/backend/app/core/__init__.py`

```python

```


## `apps/backend/app/core/config.py`

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    bot_token: str = ""
    database_url: str = "sqlite+aiosqlite:///./valorant_lfg.db"
    auth_disabled: bool = True
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

```


## `apps/backend/app/core/constants.py`

```python
RANKS = [
    "Unranked",
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Ascendant",
    "Immortal",
    "Radiant",
]

ROLES = ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"]
MICROPHONE_VALUES = ["Да", "Нет", "Иногда"]
FAVORITE_MODES = ["Ranked", "Unrated", "Premier", "Swiftplay", "Deathmatch", "Custom"]
GOALS = [
    "Найти дуо",
    "Найти трио",
    "Найти команду 5x5",
    "Найти Premier-команду",
    "Просто поиграть",
    "Найти постоянных тиммейтов",
]
AGE_RANGES = ["до 16", "16-17", "18-21", "22-25", "26+", "Не указывать"]
PLAY_TIMES = ["Утром", "Днем", "Вечером", "Ночью", "По выходным", "Гибкий график"]
TEAM_GOALS = ["Ranked-стак", "Premier-команда", "Постоянная команда", "Фан-игры", "Турниры", "Тренировки"]
TEAM_FORMATS = ["Онлайн", "Мой город", "Любой город"]
MICROPHONE_REQUIREMENTS = ["Обязательно", "Желательно", "Неважно"]

```


## `apps/backend/app/core/telegram_auth.py`

```python
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


@dataclass(frozen=True)
class TelegramUserData:
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class TelegramAuthError(Exception):
    pass


def validate_init_data(init_data: str, bot_token: str, max_age_seconds: int = 86400) -> TelegramUserData:
    if not init_data:
        raise TelegramAuthError("Missing Telegram initData")
    if not bot_token:
        raise TelegramAuthError("BOT_TOKEN is not configured")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("Missing initData hash")

    auth_date_raw = parsed.get("auth_date")
    if auth_date_raw is not None:
        try:
            auth_date = int(auth_date_raw)
        except ValueError as exc:
            raise TelegramAuthError("Invalid auth_date") from exc
        if time.time() - auth_date > max_age_seconds:
            raise TelegramAuthError("initData is expired")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise TelegramAuthError("Invalid initData hash")

    user_raw = parsed.get("user")
    if not user_raw:
        raise TelegramAuthError("Missing Telegram user")

    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise TelegramAuthError("Invalid Telegram user payload") from exc

    telegram_id = user.get("id")
    if not telegram_id:
        raise TelegramAuthError("Missing Telegram user id")

    return TelegramUserData(
        telegram_id=int(telegram_id),
        username=user.get("username"),
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
    )

```


## `apps/backend/app/db/__init__.py`

```python

```


## `apps/backend/app/db/base.py`

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass

```


## `apps/backend/app/db/session.py`

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

```


## `apps/backend/app/main.py`

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


settings = get_settings()

app = FastAPI(title="Valorant LFG Mini App API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

```


## `apps/backend/app/models/__init__.py`

```python
from app.models.entities import (
    PlayerInvite,
    Profile,
    Report,
    Team,
    TeamApplication,
    TeamMember,
    User,
    UserBlock,
)

__all__ = [
    "PlayerInvite",
    "Profile",
    "Report",
    "Team",
    "TeamApplication",
    "TeamMember",
    "User",
    "UserBlock",
]

```


## `apps/backend/app/models/entities.py`

```python
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base

JsonList = MutableList.as_mutable(JSON().with_variant(JSONB, "postgresql"))


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)

    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False)
    teams: Mapped[list["Team"]] = relationship(back_populates="captain")


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    valorant_nickname: Mapped[str] = mapped_column(String(64))
    riot_id: Mapped[str] = mapped_column(String(64), index=True)
    rank: Mapped[str] = mapped_column(String(32), index=True)
    roles: Mapped[list[str]] = mapped_column(JsonList, default=list)
    city: Mapped[str] = mapped_column(String(128), index=True)
    age_range: Mapped[str | None] = mapped_column(String(32), nullable=True)
    microphone: Mapped[str] = mapped_column(String(32), index=True)
    favorite_modes: Mapped[list[str]] = mapped_column(JsonList, default=list)
    goals: Mapped[list[str]] = mapped_column(JsonList, default=list)
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    search_status: Mapped[str] = mapped_column(String(32), default="open", index=True)

    user: Mapped[User] = relationship(back_populates="profile")


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    captain_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank_range: Mapped[str] = mapped_column(String(64), index=True)
    needed_roles: Mapped[list[str]] = mapped_column(JsonList, default=list)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    format: Mapped[str] = mapped_column(String(32), default="Онлайн", index=True)
    modes: Mapped[list[str]] = mapped_column(JsonList, default=list)
    current_players_count: Mapped[int] = mapped_column(Integer, default=1)
    needed_players_count: Mapped[int] = mapped_column(Integer, default=1)
    microphone_requirement: Mapped[str] = mapped_column(String(32), default="Неважно", index=True)
    play_time: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    goal: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    captain: Mapped[User] = relationship(back_populates="teams")
    members: Mapped[list["TeamMember"]] = relationship(back_populates="team", cascade="all, delete-orphan")
    applications: Mapped[list["TeamApplication"]] = relationship(back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_captain: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    team: Mapped[Team] = relationship(back_populates="members")
    user: Mapped[User] = relationship()


class TeamApplication(Base, TimestampMixin):
    __tablename__ = "team_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)

    team: Mapped[Team] = relationship(back_populates="applications")
    user: Mapped[User] = relationship()


class PlayerInvite(Base, TimestampMixin):
    __tablename__ = "player_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    from_user: Mapped[User] = relationship(foreign_keys=[from_user_id])
    to_user: Mapped[User] = relationship(foreign_keys=[to_user_id])


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reported_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(String(128))
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)


class UserBlock(Base):
    __tablename__ = "user_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    blocker_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    blocked_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

```


## `apps/backend/app/schemas/__init__.py`

```python
from app.schemas.base import *

```


## `apps/backend/app/schemas/base.py`

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ApiModel):
    id: int
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class ProfileBase(BaseModel):
    valorant_nickname: str = Field(min_length=2, max_length=64)
    riot_id: str = Field(min_length=3, max_length=64)
    rank: str
    roles: list[str] = Field(default_factory=list)
    city: str = Field(min_length=2, max_length=128)
    age_range: str | None = None
    microphone: str
    favorite_modes: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    about: str | None = Field(default=None, max_length=300)
    is_visible: bool = True
    search_status: str = "open"

    @field_validator("riot_id")
    @classmethod
    def validate_riot_id(cls, value: str) -> str:
        if "#" not in value or value.startswith("#") or value.endswith("#"):
            raise ValueError("Riot ID должен быть в формате Nick#Tag")
        return value.strip()


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ApiModel):
    id: int
    user_id: int
    user: UserOut | None = None
    valorant_nickname: str
    riot_id: str
    rank: str
    roles: list[str]
    city: str
    age_range: str | None = None
    microphone: str
    favorite_modes: list[str]
    goals: list[str]
    about: str | None = None
    is_visible: bool
    status: str
    search_status: str
    completion_percent: int | None = None
    created_at: datetime
    updated_at: datetime


class TeamBase(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=600)
    rank_range: str
    needed_roles: list[str] = Field(default_factory=list)
    city: str | None = Field(default=None, max_length=128)
    format: str = "Онлайн"
    modes: list[str] = Field(default_factory=list)
    current_players_count: int = Field(default=1, ge=1, le=5)
    needed_players_count: int = Field(default=1, ge=1, le=4)
    microphone_requirement: str = "Неважно"
    play_time: str | None = None
    goal: str
    is_visible: bool = True


class TeamCreate(TeamBase):
    pass


class TeamUpdate(TeamBase):
    status: str = "active"


class TeamOut(ApiModel):
    id: int
    captain_id: int
    captain: UserOut | None = None
    name: str
    description: str | None = None
    rank_range: str
    needed_roles: list[str]
    city: str | None = None
    format: str
    modes: list[str]
    current_players_count: int
    needed_players_count: int
    microphone_requirement: str
    play_time: str | None = None
    goal: str
    status: str
    is_visible: bool
    created_at: datetime
    updated_at: datetime


class ApplicationCreate(BaseModel):
    message: str | None = Field(default=None, max_length=500)


class TeamApplicationOut(ApiModel):
    id: int
    team_id: int
    user_id: int
    message: str | None = None
    status: str
    team: TeamOut | None = None
    profile: ProfileOut | None = None
    created_at: datetime
    updated_at: datetime


class InviteCreate(BaseModel):
    message: str | None = Field(default=None, max_length=500)


class PlayerInviteOut(ApiModel):
    id: int
    from_user_id: int
    to_user_id: int
    message: str | None = None
    status: str
    from_profile: ProfileOut | None = None
    to_profile: ProfileOut | None = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None


class ReportCreate(BaseModel):
    reported_user_id: int | None = None
    team_id: int | None = None
    reason: str = Field(min_length=2, max_length=128)
    comment: str | None = Field(default=None, max_length=500)


class OptionsOut(BaseModel):
    ranks: list[str]
    roles: list[str]
    microphone_values: list[str]
    favorite_modes: list[str]
    goals: list[str]
    age_ranges: list[str]
    play_times: list[str]
    team_goals: list[str]
    team_formats: list[str]
    microphone_requirements: list[str]

```


## `apps/backend/app/seed.py`

```python
import asyncio

from sqlalchemy import select

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models import Profile, Team, TeamMember, User


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).where(User.telegram_id == 2001))
        if existing.scalar_one_or_none():
            print("Seed data already exists")
            return

        users = [
            User(telegram_id=2001, username="shadowpeek", first_name="Shadow"),
            User(telegram_id=2002, username="omenjoyer", first_name="Omen"),
            User(telegram_id=2003, username="flashmenot", first_name="Flash"),
        ]
        session.add_all(users)
        await session.flush()

        profiles = [
            Profile(
                user_id=users[0].id,
                valorant_nickname="ShadowPeek",
                riot_id="Shadow#777",
                rank="Platinum",
                roles=["Controller", "Sentinel"],
                city="Алматы",
                age_range="18-21",
                microphone="Да",
                favorite_modes=["Ranked", "Premier"],
                goals=["Найти дуо", "Найти команду 5x5"],
                about="Играю вечером, не токсик. Мейн Omen/Killjoy.",
                search_status="active",
            ),
            Profile(
                user_id=users[1].id,
                valorant_nickname="OmenEnjoyer",
                riot_id="Omen#123",
                rank="Gold",
                roles=["Controller"],
                city="Астана",
                age_range="18-21",
                microphone="Да",
                favorite_modes=["Ranked"],
                goals=["Найти дуо"],
                about="Могу закрыть смоки, играю спокойно.",
            ),
            Profile(
                user_id=users[2].id,
                valorant_nickname="FlashMeNot",
                riot_id="Flash#404",
                rank="Diamond",
                roles=["Initiator", "Flex"],
                city="Алматы",
                age_range="22-25",
                microphone="Иногда",
                favorite_modes=["Premier", "Ranked"],
                goals=["Найти Premier-команду"],
                about="Флешу врагов. Иногда своих, но это фича.",
            ),
        ]
        session.add_all(profiles)
        await session.flush()

        team = Team(
            captain_id=users[0].id,
            name="Team Phantom",
            description="Играем вечером, собираем стабильный стак для ranked и Premier. Без токсика, микро желательно.",
            rank_range="Gold-Platinum",
            needed_roles=["Controller", "Sentinel"],
            city="Алматы",
            format="Онлайн",
            modes=["Ranked", "Premier"],
            current_players_count=4,
            needed_players_count=1,
            microphone_requirement="Обязательно",
            play_time="Вечером",
            goal="Постоянная команда",
        )
        session.add(team)
        await session.flush()
        session.add(TeamMember(team_id=team.id, user_id=users[0].id, role="Controller", is_captain=True))
        await session.commit()
        print("Seed data created")


if __name__ == "__main__":
    asyncio.run(seed())

```


## `apps/backend/app/services/__init__.py`

```python

```


## `apps/backend/app/services/filtering.py`

```python
from app.models import Profile, Team


def overlaps(values: list[str] | None, requested: str | None) -> bool:
    if not requested:
        return True
    return requested in (values or [])


def eq_or_empty(value: str | None, requested: str | None) -> bool:
    if not requested:
        return True
    return (value or "").lower() == requested.lower()


def profile_matches_filters(
    profile: Profile,
    rank: str | None = None,
    role: str | None = None,
    city: str | None = None,
    microphone: str | None = None,
    mode: str | None = None,
    goal: str | None = None,
    age_range: str | None = None,
) -> bool:
    return all(
        [
            eq_or_empty(profile.rank, rank),
            overlaps(profile.roles, role),
            eq_or_empty(profile.city, city),
            eq_or_empty(profile.microphone, microphone),
            overlaps(profile.favorite_modes, mode),
            overlaps(profile.goals, goal),
            eq_or_empty(profile.age_range, age_range),
        ]
    )


def team_matches_filters(
    team: Team,
    rank_range: str | None = None,
    role: str | None = None,
    city: str | None = None,
    format: str | None = None,
    mode: str | None = None,
    microphone_requirement: str | None = None,
    goal: str | None = None,
    play_time: str | None = None,
) -> bool:
    return all(
        [
            eq_or_empty(team.rank_range, rank_range),
            overlaps(team.needed_roles, role),
            eq_or_empty(team.city, city),
            eq_or_empty(team.format, format),
            overlaps(team.modes, mode),
            eq_or_empty(team.microphone_requirement, microphone_requirement),
            eq_or_empty(team.goal, goal),
            eq_or_empty(team.play_time, play_time),
        ]
    )

```


## `apps/backend/app/services/profile_service.py`

```python
from app.models import Profile

MANDATORY_PROFILE_FIELDS = [
    "valorant_nickname",
    "riot_id",
    "rank",
    "roles",
    "city",
    "microphone",
    "favorite_modes",
    "goals",
]


def profile_completion_percent(profile: Profile | None) -> int:
    if profile is None:
        return 0
    filled = 0
    for field in MANDATORY_PROFILE_FIELDS:
        value = getattr(profile, field, None)
        if isinstance(value, list):
            filled += 1 if len(value) > 0 else 0
        else:
            filled += 1 if value else 0
    return round(filled / len(MANDATORY_PROFILE_FIELDS) * 100)


def attach_completion(profile: Profile) -> Profile:
    setattr(profile, "completion_percent", profile_completion_percent(profile))
    return profile


def is_profile_complete(profile: Profile | None) -> bool:
    return profile_completion_percent(profile) == 100


def profile_match_score(candidate: Profile, viewer: Profile | None) -> int:
    if viewer is None:
        return 0

    score = 0
    if candidate.rank == viewer.rank:
        score += 3
    if set(candidate.goals or []) & set(viewer.goals or []):
        score += 3
    if set(candidate.favorite_modes or []) & set(viewer.favorite_modes or []):
        score += 2
    if set(candidate.roles or []) & set(viewer.roles or []):
        score += 2
    if candidate.city and viewer.city and candidate.city.lower() == viewer.city.lower():
        score += 1
    if candidate.microphone in {"Да", "Иногда"}:
        score += 1
    if candidate.search_status == "active":
        score += 2
    return score

```


## `apps/backend/requirements.txt`

```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
sqlalchemy>=2.0.30
asyncpg>=0.29.0
aiosqlite>=0.20.0
pydantic-settings>=2.3.0
python-dotenv>=1.0.1

```


## `apps/bot/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
CMD ["python", "-m", "app.main"]

```


## `apps/bot/app/__init__.py`

```python

```


## `apps/bot/app/config.py`

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    bot_token: str
    mini_app_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

```


## `apps/bot/app/main.py`

```python
import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from app.config import get_settings

logging.basicConfig(level=logging.INFO)

settings = get_settings()
bot = Bot(token=settings.bot_token)
dp = Dispatcher()


def mini_app_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎮 Открыть Valorant LFG",
                    web_app=WebAppInfo(url=settings.mini_app_url),
                )
            ]
        ]
    )


@dp.message(CommandStart())
async def start(message: Message) -> None:
    await message.answer(
        "Йоу! Это Valorant LFG Mini App. Тут можно заполнить анкету, найти команду или игрока.\n\n"
        "Жми кнопку ниже и залетай в приложение.",
        reply_markup=mini_app_keyboard(),
    )


@dp.message(Command("app"))
async def open_app(message: Message) -> None:
    await message.answer("Открывай Mini App:", reply_markup=mini_app_keyboard())


@dp.message(F.text)
async def fallback(message: Message) -> None:
    await message.answer(
        "Я тут как портал в Mini App. Основная магия внутри приложения 👇",
        reply_markup=mini_app_keyboard(),
    )


async def main() -> None:
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

```


## `apps/bot/requirements.txt`

```text
aiogram>=3.10.0
pydantic-settings>=2.3.0
python-dotenv>=1.0.1

```


## `apps/web/index.html`

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Valorant LFG</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```


## `apps/web/package.json`

```json
{
  "name": "valorant-lfg-miniapp-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}

```


## `apps/web/src/App.tsx`

```tsx
import { useEffect, useState } from 'react'
import { api } from './api'
import ProfilePage from './components/ProfilePage'
import TeamsPage from './components/TeamsPage'
import PlayersPage from './components/PlayersPage'
import { Button, Card } from './components/ui'
import type { Options, Profile } from './types'

type View = 'home' | 'profile' | 'teams' | 'players' | 'help' | 'settings'

const defaultOptions: Options = {
  ranks: [],
  roles: [],
  microphone_values: [],
  favorite_modes: [],
  goals: [],
  age_ranges: [],
  play_times: [],
  team_goals: [],
  team_formats: [],
  microphone_requirements: [],
}

function Home({ onNavigate, profile }: { onNavigate: (view: View) => void; profile: Profile | null }) {
  const cards = [
    { view: 'profile' as View, icon: '👤', title: 'Анкета', text: 'Заполни профиль, чтобы тебя могли найти.' },
    { view: 'teams' as View, icon: '👥', title: 'Найти команду', text: 'Подбери стак или команду под свой ранг.' },
    { view: 'players' as View, icon: '🎯', title: 'Найти игрока', text: 'Найди дуо, трио или пятого в пати.' },
    { view: 'help' as View, icon: '❓', title: 'Помощь', text: 'Как пользоваться приложением.' },
    { view: 'settings' as View, icon: '⚙️', title: 'Настройки', text: 'Приватность, уведомления, город, язык.' },
  ]

  return (
    <div className="page-stack">
      <Card className="hero">
        <p className="eyebrow">Valorant LFG Mini App</p>
        <h1>Найди тиммейтов без хаоса в чате</h1>
        <p>Анкета → поиск команды → поиск игрока → приглашение → катка. Всё по красоте.</p>
        <div className="profile-status">
          <span>Анкета: {profile ? `${profile.completion_percent || 0}%` : 'не создана'}</span>
          <span>{profile?.is_visible ? 'показывается в поиске' : 'скрыта'}</span>
        </div>
      </Card>

      <div className="menu-grid">
        {cards.map((card) => (
          <button key={card.view} className="menu-card" onClick={() => onNavigate(card.view)}>
            <span>{card.icon}</span>
            <strong>{card.title}</strong>
            <small>{card.text}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function HelpPage() {
  return (
    <div className="page-stack">
      <Card>
        <p className="eyebrow">❓ Помощь</p>
        <h2>Раздел в разработке</h2>
        <p className="muted">Позже сюда добавим правила, FAQ, объяснение заявок, жалоб и безопасного общения.</p>
      </Card>
    </div>
  )
}

function SettingsPage({ profile, onProfileChanged }: { profile: Profile | null; onProfileChanged: (profile: Profile) => void }) {
  async function toggleVisible() {
    if (!profile) return
    const updated = await api.saveProfile({
      valorant_nickname: profile.valorant_nickname,
      riot_id: profile.riot_id,
      rank: profile.rank,
      roles: profile.roles,
      city: profile.city,
      age_range: profile.age_range,
      microphone: profile.microphone,
      favorite_modes: profile.favorite_modes,
      goals: profile.goals,
      about: profile.about,
      is_visible: !profile.is_visible,
      search_status: profile.search_status,
    })
    onProfileChanged(updated)
  }

  return (
    <div className="page-stack">
      <Card>
        <p className="eyebrow">⚙️ Настройки</p>
        <h2>Базовые настройки</h2>
        <p className="muted">Полный раздел настроек сделаем позже. Пока тут быстрый переключатель видимости анкеты.</p>
        {profile ? (
          <div className="list-item">
            <div>
              <strong>Показывать анкету в поиске</strong>
              <p className="muted">Сейчас: {profile.is_visible ? 'включено' : 'выключено'}</p>
            </div>
            <Button onClick={toggleVisible} variant="secondary">{profile.is_visible ? 'Скрыть' : 'Показать'}</Button>
          </div>
        ) : (
          <p className="notice">Сначала создай анкету.</p>
        )}
      </Card>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [options, setOptions] = useState<Options>(defaultOptions)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState('')

  async function bootstrap() {
    setError('')
    try {
      const [optionsData, profileData] = await Promise.all([api.options(), api.getProfile()])
      setOptions(optionsData)
      setProfile(profileData)
      if (!profileData) setView('profile')
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Не удалось загрузить приложение')
    }
  }

  useEffect(() => {
    bootstrap()
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>VLR LFG</button>
        {view !== 'home' && <Button onClick={() => setView('home')} variant="ghost">Главная</Button>}
      </header>

      {error && <Card><p className="error">{error}</p><Button onClick={bootstrap}>Повторить</Button></Card>}

      {!error && view === 'home' && <Home onNavigate={setView} profile={profile} />}
      {!error && view === 'profile' && <ProfilePage options={options} initialProfile={profile} onSaved={setProfile} />}
      {!error && view === 'teams' && <TeamsPage options={options} />}
      {!error && view === 'players' && <PlayersPage options={options} />}
      {!error && view === 'help' && <HelpPage />}
      {!error && view === 'settings' && <SettingsPage profile={profile} onProfileChanged={setProfile} />}
    </main>
  )
}

```


## `apps/web/src/api.ts`

```typescript
import { getInitData } from './telegram'
import type { Options, PlayerInvite, Profile, ProfilePayload, Team, TeamApplication, TeamPayload } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const initData = getInitData()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (initData) {
    headers.Authorization = `tma ${initData}`
  } else {
    headers['X-Debug-Telegram-Id'] = localStorage.getItem('debugTelegramId') || '1001'
    headers['X-Debug-Username'] = localStorage.getItem('debugUsername') || 'dev_user'
  }

  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers })
  if (!response.ok) {
    let message = `Ошибка ${response.status}`
    try {
      const data = await response.json()
      message = data.detail || message
    } catch {
      // noop
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export const api = {
  options: () => request<Options>('/options'),
  getProfile: () => request<Profile | null>('/me/profile'),
  saveProfile: (payload: ProfilePayload) => request<Profile>('/me/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  listProfiles: (params: URLSearchParams) => request<Profile[]>(`/profiles?${params.toString()}`),
  invitePlayer: (profileId: number, message: string) =>
    request<PlayerInvite>(`/profiles/${profileId}/invites`, { method: 'POST', body: JSON.stringify({ message }) }),
  listPlayerInvites: (direction: 'incoming' | 'outgoing') =>
    request<PlayerInvite[]>(`/me/player-invites?direction=${direction}`),
  respondPlayerInvite: (inviteId: number, action: 'accept' | 'reject' | 'cancel') =>
    request<PlayerInvite>(`/player-invites/${inviteId}/${action}`, { method: 'POST' }),
  listTeams: (params: URLSearchParams) => request<Team[]>(`/teams?${params.toString()}`),
  createTeam: (payload: TeamPayload) => request<Team>('/teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateTeam: (teamId: number, payload: TeamPayload & { status: string }) =>
    request<Team>(`/teams/${teamId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getMyTeam: () => request<Team | null>('/me/team'),
  applyToTeam: (teamId: number, message: string) =>
    request<TeamApplication>(`/teams/${teamId}/apply`, { method: 'POST', body: JSON.stringify({ message }) }),
  listTeamApplications: () => request<TeamApplication[]>('/me/team-applications'),
  respondTeamApplication: (applicationId: number, action: 'accept' | 'reject' | 'cancel') =>
    request<TeamApplication>(`/team-applications/${applicationId}/${action}`, { method: 'POST' }),
}

```


## `apps/web/src/components/PlayersPage.tsx`

```tsx
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Options, PlayerInvite, Profile } from '../types'
import { Button, Card, EmptyState, Input, Select, Textarea } from './ui'

export default function PlayersPage({ options }: { options: Options }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [incoming, setIncoming] = useState<PlayerInvite[]>([])
  const [outgoing, setOutgoing] = useState<PlayerInvite[]>([])
  const [filters, setFilters] = useState({ rank: '', role: '', city: '', microphone: '', mode: '', goal: '', age_range: '' })
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
      const [profilesData, incomingData, outgoingData] = await Promise.all([
        api.listProfiles(params),
        api.listPlayerInvites('incoming'),
        api.listPlayerInvites('outgoing'),
      ])
      setProfiles(profilesData)
      setIncoming(incomingData)
      setOutgoing(outgoingData)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Ошибка загрузки игроков')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function setPreset(preset: 'duo' | 'ranked' | 'city' | 'mic') {
    setFilters((current) => {
      if (preset === 'duo') return { ...current, goal: 'Найти дуо', mode: 'Ranked', microphone: 'Да' }
      if (preset === 'ranked') return { ...current, mode: 'Ranked' }
      if (preset === 'mic') return { ...current, microphone: 'Да' }
      return current
    })
  }

  async function invite(profile: Profile) {
    setStatus('')
    try {
      await api.invitePlayer(profile.id, inviteMessage)
      setInviteMessage('')
      setSelectedProfile(null)
      await load()
      setStatus(`Приглашение для ${profile.valorant_nickname} отправлено`)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось отправить приглашение')
    }
  }

  async function respond(inviteId: number, action: 'accept' | 'reject' | 'cancel') {
    setStatus('')
    try {
      await api.respondPlayerInvite(inviteId, action)
      await load()
      setStatus(action === 'accept' ? 'Приглашение принято' : action === 'reject' ? 'Приглашение отклонено' : 'Приглашение отменено')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обработать приглашение')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <p className="eyebrow">🎯 Найти игрока</p>
        <h2>Подбор тиммейтов</h2>
        <p className="muted">Ищи дуо, трио или пятого игрока в стак по рангу, роли, городу и вайбу.</p>
        <div className="quick-actions">
          <Button onClick={() => setPreset('duo')} variant="secondary">🔥 Найти дуо</Button>
          <Button onClick={() => setPreset('ranked')} variant="secondary">🎮 Ranked</Button>
          <Button onClick={() => setPreset('mic')} variant="secondary">🎙 Только с микро</Button>
        </div>
        <div className="filters">
          <Select label="Ранг" value={filters.rank} onChange={(value) => updateFilter('rank', value)} options={options.ranks} placeholder="Любой" />
          <Select label="Роль" value={filters.role} onChange={(value) => updateFilter('role', value)} options={options.roles} placeholder="Любая" />
          <Input label="Город" value={filters.city} onChange={(value) => updateFilter('city', value)} placeholder="Любой" />
          <Select label="Микро" value={filters.microphone} onChange={(value) => updateFilter('microphone', value)} options={options.microphone_values} placeholder="Неважно" />
          <Select label="Режим" value={filters.mode} onChange={(value) => updateFilter('mode', value)} options={options.favorite_modes} placeholder="Любой" />
          <Select label="Цель" value={filters.goal} onChange={(value) => updateFilter('goal', value)} options={options.goals} placeholder="Любая" />
          <Select label="Возраст" value={filters.age_range} onChange={(value) => updateFilter('age_range', value)} options={options.age_ranges} placeholder="Неважно" />
        </div>
        <Button onClick={load}>{loading ? 'Ищу...' : 'Применить фильтры'}</Button>
        {status && <p className="notice">{status}</p>}
      </Card>

      {incoming.length > 0 && (
        <Card>
          <h3>Входящие приглашения</h3>
          {incoming.map((invite) => (
            <div className="list-item" key={invite.id}>
              <div>
                <strong>{invite.from_profile?.valorant_nickname || 'Игрок'}</strong>
                <p className="muted">{invite.from_profile?.rank} · {invite.from_profile?.roles.join(', ')} · {invite.status}</p>
                {invite.message && <p>{invite.message}</p>}
              </div>
              {invite.status === 'pending' && (
                <div className="row-actions">
                  <Button onClick={() => respond(invite.id, 'accept')} variant="secondary">Принять</Button>
                  <Button onClick={() => respond(invite.id, 'reject')} variant="danger">Отклонить</Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {outgoing.length > 0 && (
        <Card>
          <h3>Исходящие приглашения</h3>
          {outgoing.slice(0, 5).map((invite) => (
            <div className="list-item" key={invite.id}>
              <div>
                <strong>{invite.to_profile?.valorant_nickname || 'Игрок'}</strong>
                <p className="muted">{invite.to_profile?.rank} · {invite.status}</p>
              </div>
              {invite.status === 'pending' && <Button onClick={() => respond(invite.id, 'cancel')} variant="ghost">Отменить</Button>}
            </div>
          ))}
        </Card>
      )}

      <div className="cards-list">
        {profiles.length === 0 && <EmptyState title="Игроки не найдены" text="Попробуй снять фильтры или проверь, что твоя анкета заполнена." />}
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <div className="section-head compact">
              <div>
                <h3>{profile.valorant_nickname}</h3>
                <p className="muted">{profile.riot_id}</p>
              </div>
              <span className={`badge ${profile.search_status === 'active' ? 'badge-green' : ''}`}>{profile.search_status}</span>
            </div>
            <div className="mini-grid">
              <span>🏆 {profile.rank}</span>
              <span>🎭 {profile.roles.join(', ')}</span>
              <span>🏙 {profile.city}</span>
              <span>🎙 {profile.microphone}</span>
              <span>🎮 {profile.favorite_modes.join(', ')}</span>
              <span>🎯 {profile.goals.join(', ')}</span>
            </div>
            {profile.about && <p className="about">{profile.about}</p>}
            {selectedProfile?.id === profile.id && (
              <div className="invite-box">
                <Textarea label="Комментарий к приглашению" value={inviteMessage} onChange={setInviteMessage} placeholder="Привет, го ranked вечером?" maxLength={500} />
                <Button onClick={() => invite(profile)}>Отправить приглашение</Button>
              </div>
            )}
            <div className="row-actions">
              <Button onClick={() => setSelectedProfile(selectedProfile?.id === profile.id ? null : profile)} variant="secondary">
                {selectedProfile?.id === profile.id ? 'Свернуть' : 'Пригласить'}
              </Button>
              {profile.user?.username && (
                <a className="btn btn-ghost" href={`https://t.me/${profile.user.username}`} target="_blank" rel="noreferrer">Написать</a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

```


## `apps/web/src/components/ProfilePage.tsx`

```tsx
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { Options, Profile, ProfilePayload } from '../types'
import { Button, Card, Input, MultiSelect, Select, Textarea } from './ui'

const emptyProfile: ProfilePayload = {
  valorant_nickname: '',
  riot_id: '',
  rank: '',
  roles: [],
  city: '',
  age_range: null,
  microphone: '',
  favorite_modes: [],
  goals: [],
  about: '',
  is_visible: true,
  search_status: 'open',
}

const requiredFields: (keyof ProfilePayload)[] = [
  'valorant_nickname',
  'riot_id',
  'rank',
  'roles',
  'city',
  'microphone',
  'favorite_modes',
  'goals',
]

function toPayload(profile: Profile | null): ProfilePayload {
  if (!profile) return emptyProfile
  return {
    valorant_nickname: profile.valorant_nickname,
    riot_id: profile.riot_id,
    rank: profile.rank,
    roles: profile.roles,
    city: profile.city,
    age_range: profile.age_range,
    microphone: profile.microphone,
    favorite_modes: profile.favorite_modes,
    goals: profile.goals,
    about: profile.about || '',
    is_visible: profile.is_visible,
    search_status: profile.search_status,
  }
}

function completion(payload: ProfilePayload): number {
  const filled = requiredFields.filter((field) => {
    const value = payload[field]
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  }).length
  return Math.round((filled / requiredFields.length) * 100)
}

export default function ProfilePage({ options, initialProfile, onSaved }: {
  options: Options
  initialProfile: Profile | null
  onSaved: (profile: Profile) => void
}) {
  const [form, setForm] = useState<ProfilePayload>(toPayload(initialProfile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const percent = useMemo(() => completion(form), [form])

  useEffect(() => {
    setForm(toPayload(initialProfile))
  }, [initialProfile])

  function update<K extends keyof ProfilePayload>(key: K, value: ProfilePayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setError('')
    if (!form.riot_id.includes('#')) {
      setError('Riot ID должен быть в формате Nick#Tag')
      return
    }
    setSaving(true)
    try {
      const saved = await api.saveProfile(form)
      onSaved(saved)
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Не удалось сохранить анкету')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">👤 Анкета</p>
            <h2>Моя анкета</h2>
          </div>
          <div className="progress-ring">{percent}%</div>
        </div>
        <div className="progress"><div style={{ width: `${percent}%` }} /></div>
        <p className="muted">Заполни обязательные поля, чтобы появиться в поиске игроков и команд.</p>
      </Card>

      <Card>
        <div className="form-grid">
          <Input label="Ник в Valorant" value={form.valorant_nickname} onChange={(value) => update('valorant_nickname', value)} placeholder="ShadowPeek" />
          <Input label="Riot ID" value={form.riot_id} onChange={(value) => update('riot_id', value)} placeholder="Shadow#777" />
          <Select label="Ранг" value={form.rank} onChange={(value) => update('rank', value)} options={options.ranks} />
          <Input label="Город" value={form.city} onChange={(value) => update('city', value)} placeholder="Алматы" />
          <Select label="Возраст" value={form.age_range || ''} onChange={(value) => update('age_range', value || null)} options={options.age_ranges} placeholder="Не указывать" />
          <Select label="Микрофон" value={form.microphone} onChange={(value) => update('microphone', value)} options={options.microphone_values} />
        </div>
        <MultiSelect label="Роль" values={form.roles} onChange={(values) => update('roles', values)} options={options.roles} />
        <MultiSelect label="Любимый режим" values={form.favorite_modes} onChange={(values) => update('favorite_modes', values)} options={options.favorite_modes} />
        <MultiSelect label="Цель" values={form.goals} onChange={(values) => update('goals', values)} options={options.goals} />
        <Textarea label="О себе" value={form.about || ''} onChange={(value) => update('about', value)} placeholder="Играю вечером, не токсик, люблю ranked." maxLength={300} />

        <label className="switch-row">
          <span>Показывать меня в поиске</span>
          <input type="checkbox" checked={form.is_visible} onChange={(event) => update('is_visible', event.target.checked)} />
        </label>
        <Select
          label="Статус поиска"
          value={form.search_status}
          onChange={(value) => update('search_status', value || 'open')}
          options={['active', 'open', 'inactive']}
        />
        {error && <p className="error">{error}</p>}
        <Button onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить анкету'}</Button>
      </Card>

      <Card>
        <p className="eyebrow">Preview</p>
        <h3>{form.valorant_nickname || 'Твой ник'}</h3>
        <p className="muted">🎮 {form.riot_id || 'Nick#Tag'}</p>
        <div className="mini-grid">
          <span>🏆 {form.rank || 'Ранг'}</span>
          <span>🎭 {form.roles.join(' / ') || 'Роль'}</span>
          <span>🏙 {form.city || 'Город'}</span>
          <span>🎙 {form.microphone || 'Микрофон'}</span>
          <span>🕹 {form.favorite_modes.join(', ') || 'Режим'}</span>
          <span>🎯 {form.goals.join(', ') || 'Цель'}</span>
        </div>
        {form.about && <p className="about">{form.about}</p>}
      </Card>
    </div>
  )
}

```


## `apps/web/src/components/TeamsPage.tsx`

```tsx
import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Options, Team, TeamApplication, TeamPayload } from '../types'
import { Button, Card, EmptyState, Input, MultiSelect, Select, Textarea } from './ui'

const rankRanges = [
  'Iron-Bronze',
  'Silver-Gold',
  'Gold-Platinum',
  'Platinum-Diamond',
  'Diamond-Ascendant',
  'Ascendant-Immortal',
  'Immortal+',
  'Любой',
]

const emptyTeam: TeamPayload = {
  name: '',
  description: '',
  rank_range: '',
  needed_roles: [],
  city: '',
  format: 'Онлайн',
  modes: [],
  current_players_count: 1,
  needed_players_count: 1,
  microphone_requirement: 'Неважно',
  play_time: '',
  goal: '',
  is_visible: true,
}

export default function TeamsPage({ options }: { options: Options }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [applications, setApplications] = useState<TeamApplication[]>([])
  const [filters, setFilters] = useState({ rank_range: '', role: '', city: '', format: '', mode: '', microphone_requirement: '', goal: '', play_time: '' })
  const [form, setForm] = useState<TeamPayload>(emptyTeam)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    setStatus('')
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value))
      const [teamsData, myTeamData, appsData] = await Promise.all([
        api.listTeams(params),
        api.getMyTeam(),
        api.listTeamApplications(),
      ])
      setTeams(teamsData)
      setMyTeam(myTeamData)
      setApplications(appsData)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Ошибка загрузки команд')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function updateForm<K extends keyof TeamPayload>(key: K, value: TeamPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function createTeam() {
    setStatus('')
    try {
      const created = await api.createTeam({ ...form, city: form.city || null, play_time: form.play_time || null })
      setMyTeam(created)
      setShowCreate(false)
      setForm(emptyTeam)
      await load()
      setStatus('Команда создана')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось создать команду')
    }
  }

  async function apply(team: Team) {
    setStatus('')
    try {
      await api.applyToTeam(team.id, applicationMessage)
      setApplicationMessage('')
      setStatus(`Заявка в ${team.name} отправлена`)
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось отправить заявку')
    }
  }

  async function respond(applicationId: number, action: 'accept' | 'reject') {
    setStatus('')
    try {
      await api.respondTeamApplication(applicationId, action)
      await load()
      setStatus(action === 'accept' ? 'Заявка принята' : 'Заявка отклонена')
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обработать заявку')
    }
  }

  async function toggleTeamVisibility() {
    if (!myTeam) return
    try {
      await api.updateTeam(myTeam.id, { ...myTeam, is_visible: !myTeam.is_visible, status: myTeam.status })
      await load()
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обновить команду')
    }
  }

  async function closeRecruitment() {
    if (!myTeam) return
    try {
      await api.updateTeam(myTeam.id, { ...myTeam, status: myTeam.status === 'active' ? 'closed' : 'active' })
      await load()
    } catch (event) {
      setStatus(event instanceof Error ? event.message : 'Не удалось обновить статус')
    }
  }

  return (
    <div className="page-stack">
      <Card>
        <div className="section-head">
          <div>
            <p className="eyebrow">👥 Найти команду</p>
            <h2>Команды, которые ищут игроков</h2>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} variant="secondary">{showCreate ? 'Закрыть' : 'Создать'}</Button>
        </div>
        <div className="filters">
          <Select label="Ранг" value={filters.rank_range} onChange={(value) => updateFilter('rank_range', value)} options={rankRanges} placeholder="Любой" />
          <Select label="Роль" value={filters.role} onChange={(value) => updateFilter('role', value)} options={options.roles} placeholder="Любая" />
          <Input label="Город" value={filters.city} onChange={(value) => updateFilter('city', value)} placeholder="Любой" />
          <Select label="Формат" value={filters.format} onChange={(value) => updateFilter('format', value)} options={options.team_formats} placeholder="Любой" />
          <Select label="Режим" value={filters.mode} onChange={(value) => updateFilter('mode', value)} options={options.favorite_modes} placeholder="Любой" />
          <Select label="Микро" value={filters.microphone_requirement} onChange={(value) => updateFilter('microphone_requirement', value)} options={options.microphone_requirements} placeholder="Любой" />
          <Select label="Цель" value={filters.goal} onChange={(value) => updateFilter('goal', value)} options={options.team_goals} placeholder="Любая" />
          <Select label="Время" value={filters.play_time} onChange={(value) => updateFilter('play_time', value)} options={options.play_times} placeholder="Любое" />
        </div>
        <Button onClick={load}>{loading ? 'Ищу...' : 'Применить фильтры'}</Button>
        {status && <p className="notice">{status}</p>}
      </Card>

      {showCreate && (
        <Card>
          <h3>Создать команду</h3>
          <div className="form-grid">
            <Input label="Название" value={form.name} onChange={(value) => updateForm('name', value)} placeholder="Team Phantom" />
            <Select label="Ранг команды" value={form.rank_range} onChange={(value) => updateForm('rank_range', value)} options={rankRanges} />
            <Input label="Город" value={form.city || ''} onChange={(value) => updateForm('city', value)} placeholder="Алматы или пусто" />
            <Select label="Формат" value={form.format} onChange={(value) => updateForm('format', value)} options={options.team_formats} />
            <Select label="Микрофон" value={form.microphone_requirement} onChange={(value) => updateForm('microphone_requirement', value)} options={options.microphone_requirements} />
            <Select label="Время игры" value={form.play_time || ''} onChange={(value) => updateForm('play_time', value)} options={options.play_times} />
            <Select label="Цель" value={form.goal} onChange={(value) => updateForm('goal', value)} options={options.team_goals} />
            <Input label="Игроков сейчас" type="number" value={String(form.current_players_count)} onChange={(value) => updateForm('current_players_count', Number(value))} />
            <Input label="Ищем игроков" type="number" value={String(form.needed_players_count)} onChange={(value) => updateForm('needed_players_count', Number(value))} />
          </div>
          <MultiSelect label="Нужные роли" values={form.needed_roles} onChange={(values) => updateForm('needed_roles', values)} options={options.roles} />
          <MultiSelect label="Режимы" values={form.modes} onChange={(values) => updateForm('modes', values)} options={options.favorite_modes} />
          <Textarea label="Описание" value={form.description || ''} onChange={(value) => updateForm('description', value)} placeholder="Играем вечером, нужен спокойный Controller." maxLength={600} />
          <Button onClick={createTeam}>Создать команду</Button>
        </Card>
      )}

      {myTeam && (
        <Card className="accent-card">
          <p className="eyebrow">Моя команда</p>
          <h3>{myTeam.name}</h3>
          <p>{myTeam.rank_range} · {myTeam.needed_roles.join(', ')} · {myTeam.current_players_count}/5</p>
          <p className="muted">Статус: {myTeam.status} · Видимость: {myTeam.is_visible ? 'показывается' : 'скрыта'}</p>
          <div className="row-actions">
            <Button onClick={toggleTeamVisibility} variant="secondary">{myTeam.is_visible ? 'Скрыть' : 'Показать'}</Button>
            <Button onClick={closeRecruitment} variant="secondary">{myTeam.status === 'active' ? 'Закрыть набор' : 'Открыть набор'}</Button>
          </div>
        </Card>
      )}

      {applications.length > 0 && (
        <Card>
          <h3>Заявки в мою команду</h3>
          {applications.map((application) => (
            <div className="list-item" key={application.id}>
              <div>
                <strong>{application.profile?.valorant_nickname || 'Игрок'}</strong>
                <p className="muted">{application.profile?.rank} · {application.profile?.roles.join(', ')} · {application.status}</p>
                {application.message && <p>{application.message}</p>}
              </div>
              {application.status === 'pending' && (
                <div className="row-actions">
                  <Button onClick={() => respond(application.id, 'accept')} variant="secondary">Принять</Button>
                  <Button onClick={() => respond(application.id, 'reject')} variant="danger">Отклонить</Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <div className="cards-list">
        {teams.length === 0 && <EmptyState title="Команды не найдены" text="Попробуй снять фильтры или создай свою команду." />}
        {teams.map((team) => (
          <Card key={team.id}>
            <div className="section-head compact">
              <div>
                <h3>{team.name}</h3>
                <p className="muted">{team.rank_range} · {team.needed_roles.join(', ') || 'Любая роль'}</p>
              </div>
              <span className="badge">{team.current_players_count}/5</span>
            </div>
            <div className="mini-grid">
              <span>🏙 {team.city || team.format}</span>
              <span>🎮 {team.modes.join(', ')}</span>
              <span>🎙 {team.microphone_requirement}</span>
              <span>🕒 {team.play_time || 'Гибко'}</span>
              <span>🎯 {team.goal}</span>
            </div>
            {team.description && <p className="about">{team.description}</p>}
            {selectedTeam?.id === team.id && (
              <div className="invite-box">
                <Textarea label="Комментарий к заявке" value={applicationMessage} onChange={setApplicationMessage} placeholder="Могу закрыть Controller, онлайн вечером." maxLength={500} />
                <Button onClick={() => apply(team)}>Отправить заявку</Button>
              </div>
            )}
            <div className="row-actions">
              <Button onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)} variant="secondary">{selectedTeam?.id === team.id ? 'Свернуть' : 'Откликнуться'}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

```


## `apps/web/src/components/ui.tsx`

```tsx
import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false }: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />
    </label>
  )
}

export function Textarea({ label, value, onChange, placeholder, maxLength }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </label>
  )
}

export function Select({ label, value, onChange, options, placeholder = 'Выбрать' }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

export function MultiSelect({ label, values, onChange, options }: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  options: string[]
}) {
  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip ${values.includes(option) ? 'chip-active' : ''}`}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
    </Card>
  )
}

```


## `apps/web/src/main.tsx`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { initTelegram } from './telegram'

initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

```


## `apps/web/src/styles.css`

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #f8fafc;
  background: #070a12;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top, #2b1020 0%, #070a12 42%); }
button, input, textarea, select { font: inherit; }

.app-shell { width: min(1120px, 100%); margin: 0 auto; padding: 18px; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; position: sticky; top: 0; z-index: 10; padding: 8px 0; backdrop-filter: blur(14px); }
.brand { border: 0; color: #fff; background: linear-gradient(135deg, #ff4655, #7c3aed); padding: 12px 16px; border-radius: 18px; font-weight: 900; letter-spacing: .04em; }
.page-stack { display: grid; gap: 16px; }
.card { background: rgba(15, 23, 42, .82); border: 1px solid rgba(148, 163, 184, .18); border-radius: 24px; padding: 18px; box-shadow: 0 24px 70px rgba(0,0,0,.24); }
.hero { background: linear-gradient(135deg, rgba(255, 70, 85, .28), rgba(124, 58, 237, .18)), rgba(15, 23, 42, .84); }
h1, h2, h3, p { margin-top: 0; }
h1 { font-size: clamp(32px, 8vw, 58px); line-height: .95; margin-bottom: 14px; }
h2 { font-size: 28px; margin-bottom: 8px; }
h3 { font-size: 20px; margin-bottom: 6px; }
.eyebrow { color: #ff8a94; text-transform: uppercase; font-size: 12px; letter-spacing: .15em; font-weight: 800; margin-bottom: 8px; }
.muted { color: #94a3b8; }
.error { color: #fecaca; background: rgba(239, 68, 68, .12); padding: 12px; border-radius: 16px; }
.notice { color: #bfdbfe; background: rgba(59, 130, 246, .12); padding: 12px; border-radius: 16px; }
.about { color: #cbd5e1; line-height: 1.55; margin: 12px 0 0; }

.menu-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.menu-card { text-align: left; min-height: 150px; background: rgba(15, 23, 42, .9); border: 1px solid rgba(148, 163, 184, .16); border-radius: 24px; padding: 18px; color: #fff; display: grid; gap: 8px; cursor: pointer; transition: transform .2s, border-color .2s; }
.menu-card:hover { transform: translateY(-2px); border-color: rgba(255, 70, 85, .55); }
.menu-card span { font-size: 30px; }
.menu-card strong { font-size: 20px; }
.menu-card small { color: #94a3b8; line-height: 1.4; }

.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.section-head.compact { align-items: center; }
.progress-ring { min-width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; border: 2px solid rgba(255,255,255,.18); background: rgba(255, 70, 85, .14); font-weight: 900; }
.progress { width: 100%; height: 10px; background: rgba(148, 163, 184, .18); border-radius: 99px; overflow: hidden; margin: 12px 0; }
.progress div { height: 100%; background: linear-gradient(90deg, #ff4655, #7c3aed); border-radius: 99px; }
.profile-status { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.profile-status span, .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 8px 12px; background: rgba(255,255,255,.1); color: #e2e8f0; font-size: 13px; }
.badge-green { background: rgba(34, 197, 94, .16); color: #bbf7d0; }
.accent-card { border-color: rgba(255, 70, 85, .38); }

.form-grid, .filters, .mini-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.field { display: grid; gap: 7px; margin-bottom: 12px; }
.field span, .switch-row span { color: #cbd5e1; font-weight: 700; font-size: 14px; }
input, textarea, select { width: 100%; color: #fff; background: rgba(2, 6, 23, .7); border: 1px solid rgba(148, 163, 184, .22); border-radius: 16px; padding: 12px 14px; outline: none; }
textarea { min-height: 112px; resize: vertical; }
input:focus, textarea:focus, select:focus { border-color: #ff4655; }
.switch-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin: 14px 0; }
.switch-row input { width: 22px; height: 22px; }
.chips, .quick-actions, .row-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { background: rgba(255,255,255,.08); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, .2); border-radius: 999px; padding: 9px 12px; cursor: pointer; }
.chip-active { background: rgba(255, 70, 85, .2); border-color: #ff4655; color: #fff; }

.btn { border: 0; text-decoration: none; border-radius: 16px; padding: 11px 15px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn-primary { color: #fff; background: linear-gradient(135deg, #ff4655, #7c3aed); }
.btn-secondary { color: #fff; background: rgba(255, 70, 85, .18); border: 1px solid rgba(255, 70, 85, .42); }
.btn-danger { color: #fee2e2; background: rgba(239, 68, 68, .15); border: 1px solid rgba(239, 68, 68, .35); }
.btn-ghost { color: #cbd5e1; background: rgba(255,255,255,.07); border: 1px solid rgba(148, 163, 184, .18); }
.cards-list { display: grid; gap: 14px; }
.list-item { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 0; border-top: 1px solid rgba(148, 163, 184, .12); }
.invite-box { margin-top: 12px; padding: 12px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 18px; background: rgba(255,255,255,.04); }

@media (max-width: 720px) {
  .app-shell { padding: 12px; }
  .menu-grid, .form-grid, .filters, .mini-grid { grid-template-columns: 1fr; }
  .section-head, .list-item { align-items: stretch; flex-direction: column; }
  h1 { font-size: 36px; }
}

```


## `apps/web/src/telegram.ts`

```typescript
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
        close: () => void
        MainButton?: {
          text: string
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
      }
    }
  }
}

export function initTelegram(): void {
  const webApp = window.Telegram?.WebApp
  webApp?.ready()
  webApp?.expand()
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData || ''
}

```


## `apps/web/src/types.ts`

```typescript
export type User = {
  id: number
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
}

export type Profile = {
  id: number
  user_id: number
  user?: User | null
  valorant_nickname: string
  riot_id: string
  rank: string
  roles: string[]
  city: string
  age_range?: string | null
  microphone: string
  favorite_modes: string[]
  goals: string[]
  about?: string | null
  is_visible: boolean
  status: string
  search_status: string
  completion_percent?: number | null
  created_at: string
  updated_at: string
}

export type ProfilePayload = {
  valorant_nickname: string
  riot_id: string
  rank: string
  roles: string[]
  city: string
  age_range?: string | null
  microphone: string
  favorite_modes: string[]
  goals: string[]
  about?: string | null
  is_visible: boolean
  search_status: string
}

export type Team = {
  id: number
  captain_id: number
  captain?: User | null
  name: string
  description?: string | null
  rank_range: string
  needed_roles: string[]
  city?: string | null
  format: string
  modes: string[]
  current_players_count: number
  needed_players_count: number
  microphone_requirement: string
  play_time?: string | null
  goal: string
  status: string
  is_visible: boolean
  created_at: string
  updated_at: string
}

export type TeamPayload = {
  name: string
  description?: string | null
  rank_range: string
  needed_roles: string[]
  city?: string | null
  format: string
  modes: string[]
  current_players_count: number
  needed_players_count: number
  microphone_requirement: string
  play_time?: string | null
  goal: string
  is_visible: boolean
}

export type TeamApplication = {
  id: number
  team_id: number
  user_id: number
  message?: string | null
  status: string
  team?: Team | null
  profile?: Profile | null
  created_at: string
  updated_at: string
}

export type PlayerInvite = {
  id: number
  from_user_id: number
  to_user_id: number
  message?: string | null
  status: string
  from_profile?: Profile | null
  to_profile?: Profile | null
  created_at: string
  updated_at: string
  expires_at?: string | null
}

export type Options = {
  ranks: string[]
  roles: string[]
  microphone_values: string[]
  favorite_modes: string[]
  goals: string[]
  age_ranges: string[]
  play_times: string[]
  team_goals: string[]
  team_formats: string[]
  microphone_requirements: string[]
}

```


## `apps/web/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}

```


## `apps/web/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})

```


## `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: valorant_lfg
      POSTGRES_USER: valorant
      POSTGRES_PASSWORD: valorant
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./apps/backend
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://valorant:valorant@postgres:5432/valorant_lfg
      AUTH_DISABLED: "false"
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  bot:
    build: ./apps/bot
    env_file: .env
    depends_on:
      - backend

volumes:
  postgres_data:

```
