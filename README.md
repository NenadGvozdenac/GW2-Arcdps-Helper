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

## Vercel

### Projects

Two Vercel projects from the same repository:

**Backend** (Root Directory: `backend`)
1. Create a Postgres database (Neon / Vercel Postgres / Supabase) and copy its connection string with `sslmode=require`.
2. Environment variables: `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `CORS_ORIGIN` (the frontend URL).
3. Migrations run automatically in `deploy-backend.yml`. To run them by hand, fill `backend/.env.production`
   (copy `.env.production.example`) and run `make migrate-prod`.
4. Deploy — push to `main`; Vercel detects Express from `src/app.ts` (zero-config, no `api/` folder).

**Frontend** (Root Directory: `frontend`)
1. Set `VITE_API_URL=https://<backend-project>.vercel.app/api` in the Vercel project's Environment Variables
   (`frontend/.env.production` is git-ignored, so Vercel never sees it).
2. Deploy — push to `main`; `vercel.json` configures the Vite build and the SPA rewrite.
