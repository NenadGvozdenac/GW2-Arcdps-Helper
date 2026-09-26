# GW2 ArcDPS Helper

A personal Guild Wars 2 log tracker (ArcDPS → dps.report). Paste dps.report links; the backend fetches the
Elite Insights JSON, identifies the boss (raid wing / fractal CM / strike) and stores a summary in Postgres.
The frontend is available in English and Serbian. The desktop uploader (`uploader/`) watches the ArcDPS folder
and sends every new log to dps.report and to GW2 ArcDPS Helper automatically — see [uploader/README.md](uploader/README.md).

```
.
├── docker-compose.yml       db (Postgres) + backend (Express) + frontend (nginx)
├── backend/                 Express + TypeScript API — runs in Docker or on Vercel (zero-config Express)
│   └── src/
│       ├── app.ts           Express app (default export = Vercel entry point)
│       ├── server.ts        app.listen() for Docker / local development
│       ├── config/          env, constants
│       ├── db/              pg pool, SQL migrations and the migrate script
│       ├── types/           all TypeScript types
│       ├── data/            boss catalogue (wings, fractals, strikes)
│       ├── validation/      zod schemas + validate helper
│       ├── middleware/      requireAuth (JWT), error handler
│       ├── routes/          URL → controller mapping
│       ├── controllers/     HTTP layer (req/res)
│       ├── services/        business logic (auth, tokens, log import/parsing)
│       │   └── clients/     clients for external services (dps.report)
│       ├── repositories/    SQL queries
│       └── utils/
├── uploader/                Electron desktop app: ArcDPS folder → dps.report → GW2 ArcDPS Helper (POST /api/logs)
└── frontend/                React + Vite + TypeScript
    └── src/
        ├── config/          constants (API URL, storage keys)
        ├── i18n/            translations (locales/en.ts, locales/sr.ts) and the translate function
        ├── domain/          types/ + data/ (boss catalogue)
        ├── repositories/    HTTP client, API calls, localStorage access
        ├── services/        business logic — no React
        ├── controllers/     shared providers: I18nController, AuthController, LogsController
        └── presentation/    components, pages, router, styles; each page/component keeps its
                             `useXxxController` hook in the same .tsx file
```

> Keep `backend/src/data/encounters.ts` and `frontend/src/domain/data/encounters.ts` in sync.

## UI

Both the web app and the desktop uploader use [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS v4, "neutral" theme,
dark mode) — the React counterpart of [spartan.ng](https://spartan.ng), which is Angular-only. Components live in
`presentation/components/ui` and the theme tokens in `presentation/styles.css` of each app.

Add a component with `npx shadcn@latest add <name>` inside `frontend/` (see `components.json`) and copy it to
`uploader/src/renderer/src/presentation/components/ui` if the uploader needs it too. On Windows the CLI sometimes writes
`import { cn } from "cn"` and installs a bogus `cn` package — change the import to `@/presentation/lib/utils` and
`npm uninstall cn`.

## Localization

- Languages: English (`en`, default) and Serbian (`sr`). Switch with the EN/SR toggle in the top bar
  or on the sign-in pages; the choice is saved in `localStorage`. On first visit the browser language is used.
- `frontend/src/i18n/locales/en.ts` is the source of truth. `sr.ts` is typed against it, so a missing or
  extra key is a compile error. Use `{placeholder}` for interpolated values.
- The API returns English messages plus a machine-readable `code` (e.g. `EMAIL_TAKEN`); the frontend
  translates the code (`errors.*` keys).
- Boss, wing and fractal names are proper nouns from the game and are not translated.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | health check |
| POST | `/api/auth/register` | `{email, password, displayName, gw2Account?}` → `{token, user}` |
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` |
| GET | `/api/auth/me` | current user |
| PATCH | `/api/profile` | `{displayName?, gw2Account?}` |
| GET | `/api/logs` | all of the user's logs |
| POST | `/api/logs` | `{urls: string[]}` (max 10) → result per link (incl. the stored log and its wing/fractal group) |
| GET | `/api/logs/:id` | a single log |
| DELETE | `/api/logs/:id` | delete a log |

Authentication: `Authorization: Bearer <token>` (JWT, valid for 30 days).
Errors: `{ "error": "<English message>", "code": "<ERROR_CODE>" }`.

## Auto-refresh

The web app re-fetches the log list every 30 seconds while the tab is visible, and immediately when you
switch back to the tab, so logs sent by the desktop uploader show up without reloading. Logs that appeared
since the previous refresh are briefly highlighted. Works the same on Docker and Vercel.

## Make targets

Run `make` (or `make help`) to list them. On Windows install make first, e.g. `winget install ezwinports.make`.

| Target | What it does |
|---|---|
| `make up` | Build if needed and start db, backend and frontend |
| `make down` | Stop and remove containers (database data is kept) |
| `make restart` | `down` + `up` |
| `make build` / `make rebuild` | Build images / build without cache and start |
| `make logs` / `make ps` | Follow logs / show container status |
| `make clean` | Stop containers **and delete the database volume** |
| `make db-up` | Start only Postgres (for `npm run dev` outside Docker) |
| `make db-shell` | Open `psql` in the db container |
| `make migration name=add_notes` | Create `backend/src/db/migrations/NNN_add_notes.sql` |
| `make migrate` | Rebuild the backend image and apply pending migrations |
| `make migrate-status` | List applied migrations |
| `make migrate-local` | Apply migrations to the local database (`backend/.env.development`) |
| `make migrate-prod` | Apply migrations to the production database (`backend/.env.production`) |
| `make uploader-install` | Install the desktop uploader dependencies |
| `make uploader-dev` | Run the uploader against the local Docker stack (hot reload) |
| `make uploader-prod` | Run the uploader against production (URLs in `uploader/.env.production`) |
| `make uploader-build` / `uploader-dist` | Build the uploader / build the Windows installer + portable exe |

Migrations are plain, forward-only SQL files applied in name order; each runs once inside a transaction
and is recorded in the `schema_migrations` table. The backend container also applies them on startup.

## Docker (everything local)

```sh
docker compose up -d --build
```

- App: http://localhost:8080 (nginx serves the frontend and proxies `/api` to the backend)
- API directly: http://localhost:3000/api
- Postgres: `localhost:5432` (gw2 / gw2, database `gw2arcdpshelper`)

The backend container applies migrations on startup and reads `backend/.env.development` (with `DATABASE_URL`
pointed at the `db` service); the frontend image is built with `build:local`, so it calls `/api` through nginx.

## Environment files

| File | Used by | In git |
|---|---|---|
| `backend/.env.development` | `npm run dev`, `npm run migrate`, Docker Compose | yes — dev-only values |
| `backend/.env.production` | `npm run migrate:production` / `make migrate-prod` | **no** (git-, docker- and vercel-ignored) |
| `backend/.env.production.example` | template for the file above | yes — placeholders only |
| `frontend/.env.development` | `npm run dev`, `npm run build:local` (Docker) — `VITE_API_URL` empty = `/api` | yes |
| `frontend/.env.production` | `npm run build` on your machine — production API URL | **no** (template: `.env.production.example`) |
| `uploader/.env.development` | uploader dev builds | yes |
| `uploader/.env.production` | uploader production builds / installer | **no** (template: `.env.production.example`) |

On Vercel the backend reads its variables from **Project Settings → Environment Variables**, not from files.
Every `.env.production` is git-ignored (root `.gitignore`); copy the matching `.env.production.example` to create it.
Never put a real production secret into a committed file.

## Local development without Docker for the code

```sh
docker compose up -d db                  # database only
npm --prefix backend install
npm --prefix backend run migrate
npm --prefix backend run dev             # http://localhost:3000/api (tsx watch)
npm --prefix frontend install
npm --prefix frontend run dev            # http://localhost:5173, /api is proxied to :3000
```

## Vercel

### Automatic web deploy (GitHub Actions)

`.github/workflows/deploy-web.yml` deploys the web app to Vercel production on every push to `main` that changes
`frontend/` (or manually via *Run workflow*). It typechecks and builds first, then runs
`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` from the repo root.

One-time setup:
1. Create the web project on Vercel with **Root Directory = `frontend`** and set `VITE_API_URL` in its
   Environment Variables (Production).
2. Create a token at https://vercel.com/account/tokens.
3. Run `npx vercel link` in the repo root and read `orgId` / `projectId` from `.vercel/project.json`.
4. Add repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_WEB_PROJECT_ID`.
5. Disable Vercel's own Git auto-deploy for this project (or don't connect the repo) so it doesn't deploy twice.

### Projects

Two Vercel projects from the same repository:

**Backend** (Root Directory: `backend`)
1. Create a Postgres database (Neon / Vercel Postgres / Supabase) and copy its connection string with `sslmode=require`.
2. Environment variables: `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `CORS_ORIGIN` (the frontend URL).
3. Copy `backend/.env.production.example` to `backend/.env.production`, fill in the same values and run
   `make migrate-prod` once (and after every new migration).
4. Deploy — Vercel detects Express from `src/app.ts` (zero-config; no `api/` folder or `vercel.json` needed).

**Frontend** (Root Directory: `frontend`)
1. Set `VITE_API_URL=https://<backend-project>.vercel.app/api` in the Vercel project's Environment Variables
   (`frontend/.env.production` is git-ignored, so Vercel never sees it).
2. Deploy — push to `main` (GitHub Actions workflow above); `vercel.json` configures the Vite build and the SPA rewrite.
