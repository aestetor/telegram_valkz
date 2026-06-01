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
