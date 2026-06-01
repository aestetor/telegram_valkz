# Database Schema

Проект использует SQLAlchemy. Для разработки можно использовать SQLite, для продакшена лучше PostgreSQL.

## 1. users

Telegram-пользователь.

```text
id                  int primary key
telegram_id         bigint unique index
username            string nullable
first_name          string nullable
last_name           string nullable
created_at          datetime
updated_at          datetime
```

Назначение:

- Хранить Telegram identity.
- Связывать пользователя с анкетой, командами, заявками и приглашениями.

## 2. profiles

Анкета игрока.

```text
id                  int primary key
user_id             fk users.id unique index
valorant_nickname   string
riot_id             string
rank                string
roles               json list[str]
city                string
age_range           string nullable
microphone          string
favorite_modes      json list[str]
goals               json list[str]
about               text nullable
is_visible          bool
status              string
search_status       string
created_at          datetime
updated_at          datetime
```

Обязательные бизнес-поля:

```text
valorant_nickname
riot_id
rank
roles
city
microphone
favorite_modes
goals
```

Необязательные:

```text
age_range
about
```

Статусы `status`:

```text
active
hidden
moderation
blocked
```

Статусы `search_status`:

```text
actively_looking
open_to_invites
not_looking
```

Примечание: в текущем коде `search_status` уже есть в frontend save payload. В backend model нужно проверить поле; если оно отсутствует, добавить миграцией/моделью.

## 3. teams

Команда/стак.

```text
id                         int primary key
captain_id                 fk users.id index
name                       string index
description                text nullable
rank_range                 string index
needed_roles               json list[str]
city                       string nullable index
format                     string index
modes                      json list[str]
current_players_count      int
needed_players_count       int
microphone_requirement     string index
play_time                  string nullable index
goal                       string index
status                     string index
is_visible                 bool index
created_at                 datetime
updated_at                 datetime
```

Статусы команды:

```text
active
closed
hidden
moderation
blocked
```

## 4. team_members

Участники команды.

```text
id          int primary key
team_id     fk teams.id index
user_id     fk users.id index
role        string nullable
is_captain  bool
joined_at   datetime
```

При создании команды автор автоматически становится участником с `is_captain=true`.

## 5. team_applications

Заявки в команду.

```text
id          int primary key
team_id     fk teams.id index
user_id     fk users.id index
message     text nullable
status      string index
created_at  datetime
updated_at  datetime
```

Статусы:

```text
pending
accepted
rejected
cancelled
```

Бизнес-правила:

- Пользователь не может повторно отправить pending-заявку в ту же команду.
- Нельзя откликнуться в свою команду как обычный игрок.
- При accepted заявке можно добавить пользователя в `team_members`.

## 6. player_invites

Приглашения между игроками.

```text
id              int primary key
from_user_id    fk users.id index
to_user_id      fk users.id index
message         text nullable
status          string index
expires_at      datetime nullable
created_at      datetime
updated_at      datetime
```

Статусы:

```text
pending
accepted
rejected
cancelled
expired
```

Бизнес-правила:

- Нельзя пригласить самого себя.
- Нельзя отправить повторное pending-приглашение тому же пользователю.
- Pending invite должен истекать через 24 часа.
- После accepted пользователи получают контакты/Riot ID.

## 7. reports

Жалобы на игроков или команды.

```text
id                  int primary key
reporter_id         fk users.id index
reported_user_id    fk users.id nullable index
team_id             fk teams.id nullable index
reason              string
comment             text nullable
status              string index
created_at          datetime
updated_at          datetime
```

Причины жалоб:

```text
Токсичность
Оскорбления
Спам
Фейковая анкета
Неадекватное поведение
Реклама
Другое
```

Статусы:

```text
new
reviewing
resolved
rejected
```

## 8. user_blocks

Черный список пользователей.

```text
id                  int primary key
blocker_id          fk users.id index
blocked_user_id     fk users.id index
created_at          datetime
```

Бизнес-правило:

- Если между пользователями есть блокировка в любую сторону, приглашение/контакт должны быть недоступны.

## 9. Что желательно добавить позже

### notifications

Для внутренней истории уведомлений.

```text
id
user_id
type
payload_json
is_read
created_at
```

### admin_actions

Для аудита действий админов.

```text
id
admin_user_id
action
target_type
target_id
comment
created_at
```

### moderation_queue

Для ручной модерации анкет/команд.

```text
id
entity_type
entity_id
reason
status
created_at
updated_at
```
