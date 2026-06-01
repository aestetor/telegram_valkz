from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.constants import REPORT_REASONS, SEARCH_STATUSES


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
    search_status: str = "open_to_invites"

    @field_validator("riot_id")
    @classmethod
    def validate_riot_id(cls, value: str) -> str:
        if "#" not in value or value.startswith("#") or value.endswith("#"):
            raise ValueError("Riot ID должен быть в формате Nick#Tag")
        return value.strip()

    @field_validator("search_status")
    @classmethod
    def validate_search_status(cls, value: str) -> str:
        if value not in SEARCH_STATUSES:
            raise ValueError("Неизвестный статус поиска")
        return value


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
    needed_players_count: int = Field(default=1, ge=0, le=4)
    microphone_requirement: str = "Неважно"
    play_time: str | None = None
    goal: str
    is_visible: bool = True

    @model_validator(mode="after")
    def validate_team_size(self) -> "TeamBase":
        if self.current_players_count + self.needed_players_count > 5:
            raise ValueError("В команде Valorant максимум 5 игроков")
        return self


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

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        if value not in REPORT_REASONS:
            raise ValueError("Неизвестная причина жалобы")
        return value

    @model_validator(mode="after")
    def validate_target(self) -> "ReportCreate":
        if self.reported_user_id is None and self.team_id is None:
            raise ValueError("Укажи игрока или команду для жалобы")
        return self


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
    search_statuses: list[str]
    report_reasons: list[str]
