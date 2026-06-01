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
