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
