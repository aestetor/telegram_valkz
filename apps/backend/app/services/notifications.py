import logging

import httpx

logger = logging.getLogger(__name__)


async def send_tg_message(bot_token: str, chat_id: int, text: str) -> None:
    if not bot_token or not chat_id:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            )
    except Exception as exc:
        logger.warning("TG notification failed (chat_id=%s): %s", chat_id, exc)
