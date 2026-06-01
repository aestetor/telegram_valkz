from app.models import Profile
from app.models import Team

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
    if candidate.search_status == "actively_looking":
        score += 2
    return score


def team_match_score(team: Team, viewer: Profile | None) -> int:
    if viewer is None:
        return 0

    score = 0
    if team.rank_range == "Любой" or (viewer.rank and viewer.rank in team.rank_range):
        score += 3
    if set(team.needed_roles or []) & set(viewer.roles or []):
        score += 3
    if set(team.modes or []) & set(viewer.favorite_modes or []):
        score += 2
    if team.city and viewer.city and team.city.lower() == viewer.city.lower():
        score += 2
    if team.microphone_requirement == "Обязательно" and viewer.microphone == "Да":
        score += 1
    elif team.microphone_requirement == "Желательно" and viewer.microphone in {"Да", "Иногда"}:
        score += 1
    if team.goal in set(viewer.goals or []):
        score += 1
    return score
