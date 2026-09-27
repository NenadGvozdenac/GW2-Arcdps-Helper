# GW2 ArcDPS Helper — Backend

REST API for GW2 ArcDPS Helper: accounts, and importing Guild Wars 2 logs from [dps.report](https://dps.report).
Built with **Express 5 + TypeScript + PostgreSQL**. The same code runs as a long-running Node server
(Docker / local) and as a Vercel serverless function (zero-config Express).

Clients: the web app (`../frontend`) and the desktop uploader (`../uploader`).

## Quick start

```sh
make db-up                  # from the repo root: Postgres in Docker on localhost:5432
npm install
npm run migrate             # apply migrations (uses .env.development)
npm run dev                 # http://localhost:3000/api, reloads on change
```

Or run everything (db + backend + frontend) with `make up` from the repo root.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with `tsx watch` and `.env.development` |
| `npm run build` | Compile to `dist/` and copy the migrations |
| `npm start` | Run the compiled server (`dist/server.js`), env from the process |
| `npm run migrate` | Apply pending migrations to the local database (`.env.development`) |
| `npm run migrate:production` | Apply pending migrations to the production database (`.env.production`) |
| `npm run migration:new -- <name>` | Generate a migration from changes in `src/db/schema.ts` (drizzle-kit) |
| `npm run typecheck` | `tsc --noEmit` |

## Environment

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (`?sslmode=require` for Neon / Vercel Postgres / Supabase) |
| `JWT_SECRET` | Secret for signing tokens; **required and ≥ 32 characters in production** |
| `CORS_ORIGIN` | Allowed frontend origins, comma-separated (empty = any origin) |
| `PORT` | Port of the Node server (default `3000`; not used on Vercel) |
| `NODE_ENV` | `production` enables the strict `JWT_SECRET` checks (also implied on Vercel) |

| File | Used by | In git |
|---|---|---|
| `.env.development` | `npm run dev`, `npm run migrate`, Docker Compose | yes — dev-only values |
| `.env.production` | `npm run migrate:production` | **no** — copy `.env.production.example` |

On Vercel the variables come from **Project Settings → Environment Variables**; `.env*` files are excluded from
uploads (`.vercelignore`). Docker Compose loads `.env.development` and overrides `DATABASE_URL` to reach the `db`
service.

## Architecture

```
src/
├── app.ts            builds the Express app (default export = Vercel entry point)
├── server.ts         app.listen() for Docker / local
├── config/           env (validated access to process.env), constants
├── routes/           URL → controller mapping (everything under /api)
├── middleware/       requireAuth (Bearer JWT → res.locals.userId), error handler
├── controllers/      HTTP layer: validate input, call a service, send JSON
├── validation/       zod schemas + validate() → 400 VALIDATION_ERROR
├── services/         business logic
│   └── clients/      external HTTP clients (dps.report)
├── repositories/     Drizzle ORM queries — the only layer that touches the database
├── db/               schema.ts (tables), Drizzle client + pool, migration runner, generated migrations/
├── data/             encounter catalogue: raid wings, fractal CMs, strikes
├── types/            all TypeScript types (no types are declared in logic files)
└── utils/            HttpError helpers, permalink / date parsing
```

Request flow: `routes → middleware → controllers → validation → services → repositories → Postgres`.
Express 5 forwards errors thrown in async handlers to `errorHandler`, which turns `HttpError`s into
`{ error, code }` responses and everything else into `500 INTERNAL_ERROR`.

### Log import (`POST /api/logs`)

1. `parsePermalink` accepts `https://dps.report/<permalink>` (and sub-domains); anything else → `INVALID_LINK`.
2. If the user already has that permalink → `duplicate` (no dps.report call).
3. `dpsReportClient` fetches `getUploadMetadata` and the Elite Insights JSON (`getJson`) in parallel.
4. `logParser` builds a summary (boss, success, CM/LCM, duration, boss HP left, players with DPS/downs/deaths);
   old logs without EI JSON fall back to the metadata.
5. `encounterClassifier` maps it to an encounter + group (trigger ID first, boss-name aliases as fallback).
6. `logRepository.create` stores it (`UNIQUE (owner_id, permalink)` makes concurrent submits safe).

Links are processed 4 at a time; at most 10 per request so a request fits a Vercel function's time limit.

### Encounter catalogue

`src/data/encounters.ts` lists every raid wing (W1–W8), fractal CM (95–100) and strike with Elite Insights trigger
IDs and name aliases. **Keep it in sync with `../frontend/src/domain/data/encounters.ts`.**

## API

All routes are under `/api`. Authenticated routes need `Authorization: Bearer <token>` (JWT, valid 30 days).

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/health` | – | – | `{ ok: true }` |
| POST | `/auth/register` | – | `{ email, password, gw2Account }` | `201 { token, user }` |
| POST | `/auth/login` | – | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | ✓ | – | `{ user }` |
| PATCH | `/profile` | ✓ | `{ gw2Account }` | `{ user }` |
| PUT | `/profile/discord-webhook` | ✓ | `{ url }` (Discord webhook URL, or `null` to disconnect) | `{ user }` |
| GET | `/sessions` | ✓ | – | `{ sessions }` (newest first; `endedAt` null = active). A session not ended within 6 h is ended automatically (`endReason: "expired"`) |
| POST | `/sessions` | ✓ | `{ name? }` | `201 { session }` — ends a still-active session first |
| GET | `/sessions/active` | ✓ | – | `{ session, resumable }` — `resumable`: the last session if it expired |
| POST | `/sessions/:id/end` | ✓ | – | `{ session }` — posts one Discord message with all its logs |
| POST | `/sessions/:id/resume` | ✓ | – | `{ session }` — only for sessions that expired (`409 SESSION_NOT_RESUMABLE` otherwise) |
| DELETE | `/sessions/:id` | ✓ | – | `204` (its logs are kept) |
| POST | `/logs/upload` | ✓ | multipart, one ArcDPS log in field `file` (.zevtc/.evtc/.zip) | `{ fileName, result }` — uploaded to dps.report, then imported like a link |
| POST | `/profile/discord-webhook/test` | ✓ | `{ url }` | `204` (or `502 DISCORD_WEBHOOK_FAILED`) |
| GET | `/logs` | ✓ | – | `{ logs: Log[] }` (newest first) |
| POST | `/logs` | ✓ | `{ urls: string[] (1–10), sessionId? }` — logs of an active session are posted to Discord when it ends | `{ results: SubmitResult[] }` |
| GET | `/logs/:id` | ✓ | – | `{ log }` |
| DELETE | `/logs/:id` | ✓ | – | `204` |

`SubmitResult` per link:

```jsonc
{ "url": "...", "status": "ok" | "duplicate", "logId": "uuid", "bossName": "Cardinal Adina", "success": true,
  "log": { /* full Log */ }, "group": { "id": "w7", "short": "W7", "name": "The Key of Ahdashim", "category": "raid" } }
{ "url": "...", "status": "error", "code": "INVALID_LINK" | "FETCH_FAILED", "message": "..." }
```

Errors: `{ "error": "<English message>", "code": "<ERROR_CODE>" }`. Clients translate the code.

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body / params failed the zod schema |
| `INVALID_JSON` | 400 | Malformed JSON body |
| `UNAUTHENTICATED` | 401 | Missing / invalid / expired token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `EMAIL_TAKEN` | 409 | Registration with an existing email (case-insensitive) |
| `USER_NOT_FOUND` / `LOG_NOT_FOUND` / `SESSION_NOT_FOUND` | 404 | Unknown id or not owned by the user |
| `INVALID_LOG_FILE` | 400 | `/logs/upload` got no file or not a .zevtc/.evtc/.zip |
| `FILE_TOO_LARGE` | 413 | Uploaded log file over the size limit |
| `DISCORD_WEBHOOK_FAILED` | 502 | Discord rejected the test message (wrong or deleted webhook) |
| `ROUTE_NOT_FOUND` | 404 | Unknown route |
| `INTERNAL_ERROR` | 500 | Anything unexpected (logged on the server) |

## Database & migrations

The database is accessed through [Drizzle ORM](https://orm.drizzle.team) — no hand-written SQL.
Tables are defined in `src/db/schema.ts`: `users` (email unique case-insensitively, bcrypt password hash,
GW2 account) and `logs` (summary columns + `players` JSONB, owned by a user, cascade-deleted with it).

Migrations are generated by drizzle-kit from the schema into `src/db/migrations` (SQL + `meta/` snapshots — commit
both) and applied in order by `src/db/migrate.ts`; applied ones are recorded in `drizzle.__drizzle_migrations`.

```sh
# 1. change src/db/schema.ts, then:
npm run migration:new -- add_notes_to_logs   # generates 0001_add_notes_to_logs.sql from the schema diff
npm run migrate                              # local
npm run migrate:production                   # production (needs .env.production)
```

`0000_baseline.sql` is idempotent: it creates the tables on an empty database and adopts databases created by the
earlier hand-written migrations (it drops their `schema_migrations` table).

The Docker image runs pending migrations on start. For Vercel, `.github/workflows/deploy-backend.yml` applies them
(with the `PRODUCTION_DATABASE_URL` secret) right before each deploy; `make migrate-prod` does the same by hand.

## Security notes

- Passwords: bcrypt (10 rounds); login compares against a dummy hash when the email is unknown, so response time
  doesn't reveal which emails exist.
- Tokens: HS256 JWT signed with `JWT_SECRET`; every data query is scoped by `owner_id`.
- Input: zod validation on every body/param; JSON body limit 100 kB; ids must be UUIDs.

## Deployment

- **Docker:** `Dockerfile` (multi-stage, runs as `node`, migrates then starts). Used by `docker-compose.yml`.
- **Vercel:** separate project with Root Directory `backend`. Vercel detects the Express app from `src/app.ts`;
  set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` in the project. Pushes to `main` that touch `backend/` are
  deployed by `.github/workflows/deploy-backend.yml` (build → migrate → deploy); Vercel's own Git deployments are
  disabled in `vercel.json`. See the root README for the one-time setup.
