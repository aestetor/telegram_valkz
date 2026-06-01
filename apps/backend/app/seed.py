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
                search_status="actively_looking",
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
                search_status="open_to_invites",
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
                search_status="open_to_invites",
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
