# Roadmap

## Phase 1 — Stabilize MVP

Цель: довести текущий код до рабочего локального MVP.

Tasks:

- Проверить backend schemas/models на соответствие frontend payload.
- Запустить backend локально.
- Запустить frontend локально.
- Проверить seed data.
- Пройти flow:
  - create profile
  - search teams
  - create team
  - apply to team
  - accept/reject application
  - search players
  - invite player
  - accept/reject invite
- Исправить ошибки типов TypeScript.
- Исправить ошибки API payload/response.

## Phase 2 — Помощь и Настройки

### Help

Добавить экран:

- Как заполнить анкету.
- Как найти команду.
- Как найти игрока.
- Как работают заявки.
- Как работают приглашения.
- Правила комьюнити.
- Жалобы и блокировки.
- FAQ.

### Settings

Добавить:

- Видимость анкеты.
- Статус поиска.
- Уведомления.
- Город по умолчанию.
- Язык.
- Черный список.
- Удаление профиля.

## Phase 3 — Telegram notifications

Добавить bot notifications:

```text
Новая заявка в команду
Заявку приняли
Заявку отклонили
Новое приглашение сыграть
Приглашение приняли
Приглашение отклонили
```

Нужно решить архитектуру:

1. Backend вызывает Telegram Bot API напрямую.
2. Backend кладет notification в queue, bot worker отправляет.
3. Сначала можно проще: backend напрямую через bot token.

## Phase 4 — Moderation

Добавить:

- Жалобы в UI.
- Админский список жалоб.
- Бан пользователя.
- Скрытие анкеты.
- Скрытие команды.
- Логи действий админа.

## Phase 5 — Matchmaking improvements

Добавить улучшенный скоринг:

```text
+3 совпадает ранг
+3 совпадает цель
+2 совпадает режим
+2 совпадает роль
+1 совпадает город
+1 есть микрофон
+2 недавно активен
```

Добавить быстрые пресеты:

```text
Найти дуо
Ranked сейчас
Premier
Из моего города
Только с микро
```

## Phase 6 — Production deploy

Tasks:

- PostgreSQL.
- Alembic migrations.
- HTTPS frontend.
- Backend deployment.
- Bot deployment.
- Domain and CORS.
- Real Telegram bot setup.
- Monitoring/logging.

## Phase 7 — Nice-to-have features

- Рейтинг игроков.
- Верификация Riot ID.
- Premier-команды.
- Командный календарь.
- Расписание игр.
- Автоархив старых команд.
- “Недавно активные” игроки.
- “Похожие игроки”.
- Публичные объявления в Telegram-чат.
- Авто-пост команды/поиска в канал.
