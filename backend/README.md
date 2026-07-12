# ⚙️ My Gym — Backend

The modular **Fastify + TypeScript** server that powers My Gym: authentication, offline sync, statistics, and AI coaching — backed by PostgreSQL.

## Features

- **REST API** — versioned under `/v1`, split into 14 focused modules (workouts, exercises, stats, sync, assistant…).
- **Auth** — JWT access + refresh sessions, Argon2 password hashing, per-route rate limiting.
- **Offline sync** — pull/push endpoints with conflict resolution and deletion tombstones.
- **Statistics** — dashboards, streaks, calendar heatmaps, muscle balance, and personal records, all computed server-side.
- **AI coaching** — a conversational coach plus proactive insights via Google Gemini, grounded strictly in the athlete's own data.
- **Retention** — workouts and records auto-purge after one year.
- **Hardened** — Helmet, rate limiting, Zod request validation, and a non-root Docker image.

## Stack

Node 24 · Fastify 5 · TypeScript · Prisma 7 · PostgreSQL · Zod · Google Gemini

## Getting Started

**Prerequisites:** Node 24 and a PostgreSQL database.

1. Install dependencies

```bash
npm install
```

2. Configure your environment

```bash
cp .env.example .env
```

Fill in the variables.

3. Apply the database migrations

```bash
npm run db:migrate
```

4. Start the server

```bash
npm run dev
```

The API is live, verify it with `GET /v1/health`.

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Deploy migrations, then run |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Lint with ESLint |
| `npm run db:migrate` | Create & apply a dev migration |
| `npm run db:studio` | Open Prisma Studio |

## Docker

```bash
docker build -f .docker/Dockerfile -t my-gym-backend .
docker run --env-file .env -p 3000:3000 my-gym-backend
```

## Layout

```
backend/
├─ src/
│  ├─ modules/   feature modules (routes · controller · models)
│  ├─ plugins/   env · security · database · auth · AI · retention
│  ├─ shared/    schemas, pagination & math helpers
│  └─ index.ts   app bootstrap
└─ prisma/       schema & migrations
```
