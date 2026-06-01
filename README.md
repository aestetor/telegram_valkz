# Valorant LFG Telegram Mini App

Telegram Mini App для Valorant-сообщества Казахстана: анкета игрока, поиск команды, поиск игрока, заявки, приглашения, помощь, настройки и жалобы.

## Что внутри

- `apps/backend` - FastAPI API, Telegram initData auth, SQLAlchemy async models.
- `apps/bot` - Telegram bot на aiogram 3 с кнопкой открытия Mini App.
- `apps/web` - React + Vite интерфейс Mini App.
- `docs` - продуктовая спецификация, UX flows, API/DB docs и handoff.

## Локальный запуск без Docker

1. Скопируй `.env.example` в `.env`.
2. Для локальной разработки оставь `AUTH_DISABLED=true`.
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

5. Запусти bot, если есть реальный `BOT_TOKEN`:

```bash
cd apps/bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## Локальный запуск через Docker Compose

```bash
docker compose up --build
```

По умолчанию compose поднимает:

- backend на `http://localhost:8000`;
- web на `http://localhost:5173`;
- PostgreSQL на `localhost:5432`.

В compose включен `AUTH_DISABLED=true`, чтобы web можно было открыть локально без реального Telegram `initData`. Для production переключи `AUTH_DISABLED=false`.

Bot не стартует по умолчанию, потому что ему нужен реальный `BOT_TOKEN`. Чтобы поднять его вместе с остальным:

```bash
docker compose --profile bot up --build
```

## Реализовано

- Анкета: создание, редактирование, видимость, прогресс заполнения, preview, Riot ID validation.
- Поиск команды: фильтры, создание команды, заявка в команду, принятие/отклонение.
- Поиск игрока: фильтры, приглашения, входящие/исходящие, принятие/отклонение/отмена.
- Help: FAQ, правила, заявки, инвайты, жалобы.
- Settings: видимость анкеты, статус поиска, локальные настройки.
- Backend business rules: лимиты, 24h cooldown, expired invites, приватность контактов до accepted, full-team handling.
- Reports API и минимальный UI жалоб.

## Production notes

В production нужны HTTPS для Mini App, реальный `BOT_TOKEN`, `AUTH_DISABLED=false`, PostgreSQL, миграции Alembic, мониторинг и отдельная настройка CORS под домен приложения.
