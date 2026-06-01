# API Spec

Backend: FastAPI.

Все основные защищенные endpoints должны использовать Telegram Mini App `initData` через заголовок:

```http
X-Telegram-Init-Data: <window.Telegram.WebApp.initData>
```

В dev-режиме код может использовать mock-user fallback, но для production это нужно отключить.

## 1. System

### GET `/api/health`

Проверка живости API.

Response:

```json
{"status":"ok"}
```

### GET `/api/options`

Возвращает списки значений для select/multiselect.

Response fields:

```text
ranks
roles
microphone_values
favorite_modes
goals
age_ranges
play_times
team_goals
team_formats
microphone_requirements
```

## 2. Profile / Анкета

### GET `/api/me/profile`

Возвращает профиль текущего пользователя или `null`.

### PUT `/api/me/profile`

Создает или обновляет анкету.

Payload:

```json
{
  "valorant_nickname": "ShadowPeek",
  "riot_id": "Shadow#777",
  "rank": "Platinum",
  "roles": ["Controller", "Sentinel"],
  "city": "Алматы",
  "age_range": "18-21",
  "microphone": "Да",
  "favorite_modes": ["Ranked", "Premier"],
  "goals": ["Найти дуо", "Найти команду"],
  "about": "Играю вечером, не токсик.",
  "is_visible": true,
  "search_status": "actively_looking"
}
```

Response: `ProfileOut` с completion fields.

### GET `/api/profiles`

Поиск игроков.

Query params:

```text
rank
role
city
microphone
mode
goal
age_range
limit
```

Правила:

- Требует заполненную анкету текущего пользователя.
- Не возвращает текущего пользователя.
- Показывает только `is_visible=true` и `status=active`.
- Сортирует по match score.

## 3. Player Invites / Приглашения игрокам

### POST `/api/profiles/{profile_id}/invites`

Отправить приглашение игроку.

Payload:

```json
{"message":"Привет, го ranked вечером?"}
```

Rules:

- Требует заполненную анкету.
- Нельзя пригласить себя.
- Нельзя отправить повторный pending invite.
- Нельзя приглашать при блокировке.
- Invite expires in 24 hours.

### GET `/api/me/player-invites?direction=incoming|outgoing`

Список входящих или исходящих приглашений.

### POST `/api/player-invites/{invite_id}/{action}`

`action`:

```text
accept
reject
cancel
```

Rules:

- accept/reject может делать только получатель.
- cancel может делать только отправитель.
- Обработать можно только pending invite.

## 4. Teams / Команды

### GET `/api/teams`

Поиск команд.

Query params:

```text
rank_range
role
city
mode
microphone_requirement
goal
play_time
limit
```

Rules:

- Требует заполненную анкету.
- Возвращает только visible active teams.
- Фильтрует и сортирует по match score.

### POST `/api/teams`

Создать команду.

Payload:

```json
{
  "name": "Team Phantom",
  "description": "Играем ranked вечером, собираем постоянный стак.",
  "rank_range": "Gold-Platinum",
  "needed_roles": ["Controller", "Sentinel"],
  "city": "Алматы",
  "format": "Онлайн",
  "modes": ["Ranked", "Premier"],
  "current_players_count": 4,
  "needed_players_count": 1,
  "microphone_requirement": "Обязательно",
  "play_time": "Вечером",
  "goal": "Постоянная команда",
  "is_visible": true
}
```

Rules:

- Требует заполненную анкету.
- Автор становится капитаном и участником команды.

### GET `/api/teams/{team_id}`

Получить подробности команды.

### PUT `/api/teams/{team_id}`

Обновить команду.

Rules:

- Только капитан может редактировать.

### GET `/api/me/team`

Вернуть команду текущего пользователя, если он капитан.

## 5. Team Applications / Заявки в команду

### POST `/api/teams/{team_id}/apply`

Отправить заявку в команду.

Payload:

```json
{"message":"Могу играть Controller, онлайн вечером."}
```

Rules:

- Требует заполненную анкету.
- Нельзя отправить повторную pending-заявку.
- Нельзя откликаться в неактивную/скрытую команду.

### GET `/api/me/team-applications`

Получить заявки в команду текущего капитана.

### POST `/api/team-applications/{application_id}/{action}`

`action`:

```text
accept
reject
cancel
```

Rules:

- accept/reject может делать только капитан.
- cancel может делать только автор заявки.
- При accept нужно добавить пользователя в `team_members`.

## 6. Reports / Жалобы

### POST `/api/reports`

Создать жалобу на игрока или команду.

Payload:

```json
{
  "reported_user_id": 123,
  "team_id": null,
  "reason": "Токсичность",
  "comment": "Оскорблял в чате"
}
```

Нужно валидировать, что указан хотя бы `reported_user_id` или `team_id`.

## 7. Что добавить позже

- Admin endpoints:
  - `/api/admin/reports`
  - `/api/admin/users/{id}/ban`
  - `/api/admin/teams/{id}/moderate`
- Notifications endpoints.
- User blocks endpoints.
- Delete profile endpoint.
- Full settings endpoint.
