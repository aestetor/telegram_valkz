# Tech Architecture

## 1. Stack

### Backend

```text
Python
FastAPI
SQLAlchemy 2 async
Pydantic
SQLite for local dev
PostgreSQL for production
Uvicorn
```

### Bot

```text
Python
aiogram 3
Telegram Bot API
InlineKeyboardButton with web_app
```

### Web Mini App

```text
React
TypeScript
Vite
Telegram WebApp JS API
CSS modules/plain CSS currently
```

### Infra

```text
Docker
Docker Compose
.env config
```

## 2. Repository structure

```text
valorant-lfg-miniapp/
├── apps/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── core/
│   │   │   ├── db/
│   │   │   ├── models/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── main.py
│   │   │   └── seed.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── bot/
│   │   ├── app/
│   │   │   ├── config.py
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── api.ts
│       │   ├── App.tsx
│       │   ├── telegram.ts
│       │   ├── types.ts
│       │   └── styles.css
│       ├── package.json
│       └── vite.config.ts
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 3. Runtime flow

```text
Telegram Bot
↓ opens
Telegram Mini App Web frontend
↓ sends initData
Backend API
↓ validates initData
Database
```

## 4. Telegram auth

Frontend получает:

```ts
window.Telegram.WebApp.initData
```

И отправляет его в backend header:

```http
X-Telegram-Init-Data: <initData>
```

Backend должен:

1. Проверить hash через bot token.
2. Достать Telegram user.
3. Создать/обновить запись в `users`.
4. Вернуть текущий user context для API.

В dev-режиме может быть mock user, но в production это нужно отключить.

## 5. Frontend architecture

Главный компонент: `App.tsx`.

View states:

```ts
type View = 'home' | 'profile' | 'teams' | 'players' | 'help' | 'settings'
```

Основные компоненты:

```text
ProfilePage.tsx — анкета
TeamsPage.tsx — поиск/создание команд/заявки
PlayersPage.tsx — поиск игроков/приглашения
ui.tsx — простые UI primitives
```

API client:

```text
src/api.ts
```

Telegram integration:

```text
src/telegram.ts
```

## 6. Backend architecture

Entrypoint:

```text
apps/backend/app/main.py
```

Routes:

```text
apps/backend/app/api/routes.py
```

Models:

```text
apps/backend/app/models/entities.py
```

Schemas:

```text
apps/backend/app/schemas/base.py
```

Services:

```text
profile_service.py — completion, validation, scoring
filtering.py — filters for profiles and teams
```

## 7. Local startup

Backend:

```bash
cd apps/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Web:

```bash
cd apps/web
npm install
npm run dev
```

Bot:

```bash
cd apps/bot
pip install -r requirements.txt
python -m app.main
```

Docker compose:

```bash
docker compose up --build
```

## 8. Environment variables

Expected `.env` values:

```env
BOT_TOKEN=123456:telegram_bot_token
WEB_APP_URL=https://your-mini-app-url.example
API_BASE_URL=http://localhost:8000/api
DATABASE_URL=sqlite+aiosqlite:///./valorant_lfg.db
ENVIRONMENT=development
```

## 9. Production notes

- Mini App URL must be HTTPS.
- Bot must use correct `WEB_APP_URL`.
- Backend CORS must allow Mini App domain.
- Disable dev mock auth.
- Use PostgreSQL instead of SQLite.
- Add migrations via Alembic.
- Add rate limits for invites/applications.
- Add logging/monitoring.
