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
