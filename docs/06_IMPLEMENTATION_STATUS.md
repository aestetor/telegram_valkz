# Implementation Status

## 1. Already implemented in starter project

### Backend

- FastAPI app.
- CORS setup.
- SQLAlchemy async setup.
- Telegram initData auth helper.
- User creation/update from Telegram user.
- Models for:
  - User
  - Profile
  - Team
  - TeamMember
  - TeamApplication
  - PlayerInvite
  - Report
  - UserBlock
- API routes for:
  - health
  - options
  - my profile get/upsert
  - profile search
  - player invites
  - team search
  - team create/get/update
  - my team
  - team applications
  - reports
- Filtering helpers.
- Profile completion helper.
- Seed script with test users/profiles/team.

### Bot

- aiogram 3 bot.
- `/start` command.
- Web App open button.
- Basic help text.

### Web

- React/Vite app.
- Main home screen.
- Profile page.
- Teams page.
- Players page.
- Help placeholder.
- Settings placeholder with profile visibility toggle.
- API client.
- Telegram WebApp integration.
- CSS styling.

## 2. Important: things to verify/fix

### 2.1 Backend model vs frontend payload

Frontend sends `search_status` in profile save payload. Check that backend `Profile` model and `ProfileUpdate` schema contain this field. If not, add it.

### 2.2 Accepted team application

On accepting a team application, backend should:

1. Set application status to accepted.
2. Add accepted user to `team_members`.
3. Possibly increment `current_players_count`.
4. If team is full, optionally set `status=closed`.

Check current implementation and add missing logic if needed.

### 2.3 Contacts after accepted invite/application

Currently API returns profiles. Need decide what data is exposed after accepted:

- Telegram username.
- Riot ID.
- Maybe direct deep link to Telegram user if username exists.

Do not expose private contact data before accept.

### 2.4 Rate limiting

Need add limits:

```text
Max 20 player invites per day
Max 10 team applications per day
Repeat invite/apply cooldown 24h
```

### 2.5 Expired invites

Pending invites should auto-expire after `expires_at`.

Possible options:

- Check expiration during list/respond.
- Background task.
- Cron job.

## 3. Not implemented yet

### Help

Needs full screen/content.

### Settings

Needs full settings system:

- search status
- notification preferences
- city default
- language
- privacy
- blocked users
- delete profile

### Admin panel

Not implemented.

Needed:

- list reports
- resolve reports
- ban/unban users
- hide/block teams
- moderation queue
- stats

### Notifications

Current system is API-only. Need Telegram bot notifications for:

- New team application to captain.
- Application accepted/rejected to applicant.
- New player invite to recipient.
- Invite accepted/rejected to sender.

### Migrations

No Alembic yet. Add before production.

### Tests

No tests yet.

Suggested tests:

- profile completion
- Riot ID validation
- search filters
- invite permissions
- team application permissions
- telegram initData validation

## 4. Current MVP state

Good enough as a starter skeleton. Not production-ready yet.

Production blockers:

```text
HTTPS deployment
real Telegram bot token
production initData validation
PostgreSQL
Alembic migrations
rate limits
notifications
admin moderation
proper error handling
```
