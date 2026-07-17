<div align="center">

project-restructure
1-Database :

<img src="public/vorn_dark.svg" alt="Vorn" width="60" />
 main

# Vorn

**A SQL learning platform built to make SQL actually stick.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-ESM-black?style=flat-square&logo=express)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Isolated_Sandboxes-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

</div>

---

## What is Vorn?

Most SQL platforms teach by having you read syntax and memorize examples. Vorn is built around the opposite philosophy — **you learn by doing, immediately, repeatedly, and with real consequences.**

Every lesson ends with a practice problem that directly tests what you just read. After completing lessons, standalone problems challenge you to combine knowledge from multiple topics without hints or scaffolding. Each track closes with a timed exam. The whole system is designed so that SQL concepts are reinforced at every step until they become instinct.

Queries run inside **real, fully isolated database instances** — not simulated output. Every execution spawns a fresh sandbox, runs your SQL against it, and destroys it. No state leaks between users or sessions.

---

## Features

### For Students

- **Structured learning tracks** — ordered lessons with embedded practice problems, unlocking progressively
- **Three SQL dialects** — write and submit in PostgreSQL, MySQL, or SQLite; all content is dialect-aware
- **Real execution** — queries run in isolated Docker sandboxes, results are actual database output
- **Monaco editor** — SQL linting, dialect-specific warnings, configurable font/size/minimap/ligatures
- **Run & Submit** — test queries freely with Run, then submit for grading and XP rewards
- **Hints & solutions** — available at an XP cost, so using them feels like a deliberate tradeoff
- **Canvas notes** — freehand drawing panel alongside the editor for working through problems visually
- **Flexible timer** — problems can have enforced time limits or a user-controlled stopwatch/countdown
- **Track exams** — timed, mixed-format exams (SQL + multiple choice + true/false) to close each track
- **XP, levels & badges** — earned through correct solves; deducted for hints, solution views, and exam failures
- **Certificates** — issued on passing a track exam above the certification threshold
- **Leaderboard** — ranked across XP, problems solved, streak, and success rate
- **User dashboard** — submission heatmap, progress charts, badge showcase, solve history

### For Admins

- **Content management** — full CRUD for tracks, lessons, problems, exams, and badges from a dedicated admin panel
- **Per-dialect SQL editor** — schema, starter, and solution SQL configured per dialect for every problem
- **Automatic sandbox templates** — saving a problem pre-builds isolated database templates so user executions are instant
- **User management** — search, filter, promote, unverify, or remove users
- **Platform dashboard** — usage stats, submission volume, error rates, and service health

---

## Tech Stack

| Layer      | Technology                                                                       |
| ---------- | -------------------------------------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui                     |
| Backend    | Express.js (ESM), Node.js                                                        |
| Database   | PostgreSQL (application data + sandbox host)                                     |
| Execution  | Docker — three containers: `sql-postgres-mvp`, `sql-mysql-mvp`, `sql-sqlite-mvp` |
| Auth       | JWT (HTTP-only, bcrypt password hashing)                                         |
| Editor     | Monaco Editor with custom SQL dialect support                                    |
| Animations | Motion/React, Magic UI                                                           |
| Charts     | Recharts                                                                         |

---

## How Execution Works

When a user runs or submits a query:

1. The backend resolves a **pre-built template database** for the problem (created when the admin saved it)
2. A **sandbox database is cloned** from the template — near-instant for Postgres (filesystem copy), file copy for SQLite, `mysqldump | mysql` for MySQL
3. The user's SQL runs inside the sandbox with a hard timeout
4. Results are parsed and returned
5. The sandbox is **destroyed in the background** — nothing persists

For submission, the result is compared against the reference solution(s) by running them through the same sandbox and normalizing both outputs. No string matching — actual result set comparison.

```
Admin saves problem
  └─ Schema SQL → Docker template DB built once (background)

User submits query
  └─ Clone template → run SQL → compare results → award XP → destroy sandbox
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, register, verify, forgot password
│   ├── admin/dashboard/    # Admin panel (content, users, stats)
│   └── main/               # Student-facing pages
│       ├── home/
│       ├── learning/tracks/
│       ├── problems/
│       ├── leaderboard/
│       └── profile/
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── SqlEditor/          # Monaco editor wrapper + settings
│   └── SchemaViewer/       # SQL schema parser + visual table renderer
└── server/
    ├── routes/             # Express routers
    ├── executor/           # postgresExecutor, mysqlExecutor, sqliteExecutor
    ├── templateManager.js  # Docker template lifecycle
    ├── runCoreExecution.js # Unified execution entry point
    └── middleware/         # JWT auth, role guard
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (three containers running — see below)
- PostgreSQL

### Docker Containers

The three execution engines run as Docker containers. Pull and start them:

```bash
# PostgreSQL sandbox engine
docker run -d --name sql-postgres-mvp \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16

# MySQL sandbox engine
docker run -d --name sql-mysql-mvp \
  -e MYSQL_ROOT_PASSWORD=root \
  mysql:8

# SQLite sandbox engine
docker run -d --name sql-sqlite-mvp \
  alpine sh -c "apk add sqlite && sleep infinity"
```

### Installation

```bash
# Clone
git clone https://github.com/your-username/vorn.git
cd vorn

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, SMTP credentials

# Run database migrations
npm run db:migrate

# Start dev servers (Next.js + Express)
npm run dev
```

The user app runs on `localhost:3000`, the admin panel on `admin.localhost:3000`.

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vorn

# Auth
JWT_SECRET=your-secret-key

# Email (for verification + password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@vorn.app
SMTP_PASS=your-smtp-password

# Docker container names (if different from defaults)
POSTGRES_CONTAINER=sql-postgres-mvp
MYSQL_CONTAINER=sql-mysql-mvp
SQLITE_CONTAINER=sql-sqlite-mvp
```

---

## Learning Flow

```
Register → Verify email
  └─ Home page
       └─ Tracks page
            └─ Lesson  →  Practice problem
            └─ Lesson  →  Practice problem
            └─ ...
            └─ Track Exam  →  Certificate (if score ≥ threshold)
                 └─ Next track unlocks
```

Each track requires completing the previous one. Each exam has a pass threshold (default 85%) and a certificate threshold (default 90%). Failing an exam costs XP. The platform does not let you skip ahead.

---

## License

MIT

---

<div align="center">
  <sub>Built for SQL mastery · gh.aen</sub>
</div>
