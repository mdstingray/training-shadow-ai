# Shadow AI Quiz Platform — Stingray

Interactive quiz platform for Shadow AI awareness training. Built for the Stingray Town Hall (April 23, 2026).

## Quick Start

```bash
cd quiz-platform
cp .env.example .env
npm install
npm run seed
npm start
```

The seed script prints sample user links to the console. Open one in your browser.

## Architecture

```
quiz-platform/
  frontend/quiz.html       <- quiz UI (loads via ?code=XXXX)
  backend/server.js         <- Node.js + Express API
  backend/routes/auth.js    <- validate unique codes
  backend/routes/quiz.js    <- submit answers, get progress
  backend/routes/admin.js   <- admin dashboard API
  backend/db/init.js        <- SQLite schema + connection
  admin/dashboard.html      <- admin view
  scripts/seed-quiz.js      <- seed DB with quiz + sample users
```

## Authentication

Each employee receives a unique personal link:
```
http://localhost:3000/quiz?code=ABC123XYZ
```

No login form — the code in the URL identifies the user.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/start` | Validate code, return quiz + user info |
| POST | `/api/submit` | Submit module answers |
| GET | `/api/progress/:code` | Get user progress |
| GET | `/admin/api/users` | List all users (requires `?token=ADMIN_TOKEN`) |
| GET | `/admin/api/export.csv` | CSV export (requires `?token=ADMIN_TOKEN`) |
| PUT | `/admin/api/quiz/:id/deadline` | Update quiz deadline |

## Admin Dashboard

```
http://localhost:3000/admin/dashboard.html?token=changeme
```

Features: user table with status/score/time, filters, deadline editor, CSV export.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| ADMIN_TOKEN | changeme | Admin dashboard auth token |
| DB_PATH | ./backend/db/quiz.db | SQLite database path |

## Multi-Quiz Support

The schema supports multiple quizzes. Each quiz has its own modules, user list, and deadline.
