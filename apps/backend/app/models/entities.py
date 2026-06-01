from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
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
    search_status: Mapped[str] = mapped_column(String(32), default="open_to_invites", index=True)

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
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member_team_user"),)

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
