# GW2 ArcDPS Helper

A personal Guild Wars 2 log tracker (ArcDPS → dps.report). Paste dps.report links; the backend fetches the
Elite Insights JSON, identifies the boss (raid wing / fractal CM / strike) and stores a summary in Postgres.
The frontend is available in English and Serbian. The desktop uploader (`uploader/`) watches the ArcDPS folder
and sends every new log to dps.report and to GW2 ArcDPS Helper automatically — see [uploader/README.md](uploader/README.md). The same uploader, with
session recording, also runs inside the game as a Nexus addon — see [nexus-addon/README.md](nexus-addon/README.md).

```
.
├── docker-compose.yml       db (Postgres) + backend (tsx watch) + frontend (Vite dev server) — hot reload
├── backend/                 Express + TypeScript API — runs in Docker or on Vercel (zero-config Express)
│   └── src/
│       ├── app.ts           Express app (default export = Vercel entry point)
│       ├── server.ts        app.listen() for Docker / local development
│       ├── config/          env, constants
│       ├── db/              Drizzle schema + client, generated migrations and the migrate script
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
├── nexus-addon/             in-game Nexus addon (C++ DLL): the same upload pipeline + session recording
└── frontend/                React + Vite + TypeScript
    └── src/
        ├── config/          constants (API URL, storage keys)
        ├── i18n/            translations (locales/en.ts, locales/sr.ts) and the translate function
        ├── domain/          types/ + data/ (boss catalogue)
        ├── repositories/    HTTP client, API calls
        ├── storage/         localStorage access (JWT, language, logs per page)
        ├── services/        business logic — no React
        ├── controllers/     shared providers: I18nController, AuthController, LogsController, SessionsController
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
| `make up` | Build if needed and start db, backend and frontend **with hot reload** (runs in the foreground; Ctrl+C stops) |
| `make down` | Stop and remove containers (database data is kept) |
| `make restart` | `down` + `up` |
| `make build` / `make rebuild` | Build images / build without cache and start |
| `make logs` / `make ps` | Follow logs / show container status |
| `make clean` | Stop containers **and delete the database volume** |
| `make db-up` | Start only Postgres (for `npm run dev` outside Docker) |
| `make db-shell` | Open `psql` in the db container |
| `make migration name=add_notes` | Generate a migration from changes in `backend/src/db/schema.ts` |
| `make migrate` | Rebuild the backend image and apply pending migrations |
| `make migrate-status` | List applied migrations |
| `make migrate-local` | Apply migrations to the local database (`backend/.env.development`) |
| `make migrate-prod` | Apply migrations to the production database (`backend/.env.production`) |
| `make uploader-install` | Install the desktop uploader dependencies |
| `make uploader-dev` | Run the uploader against the local Docker stack (hot reload) |
| `make uploader-prod` | Run the uploader against production (URLs in `uploader/.env.production`) |
| `make uploader-build` / `uploader-dist` | Build the uploader / build the Windows installer + portable exe |
| `make addon-zig` | Build the Nexus addon DLL with zig (`winget install zig.zig`) → `nexus-addon/build` |
| `make addon-build` | Build the Nexus addon DLL with CMake + Visual Studio 2022 → `nexus-addon/build/Release` |

The backend uses Drizzle ORM: tables live in `backend/src/db/schema.ts`, and drizzle-kit generates the migrations
from it. Applied migrations are recorded in `drizzle.__drizzle_migrations`. The backend container also applies them
on startup.

## Releasing a new version

The desktop uploader and the Nexus addon are released separately. You push a git tag, GitHub Actions builds it and
publishes a GitHub Release, and the download links on the landing page switch to the new files by themselves. The
page asks the GitHub API for the newest release of each tag, so no redeploy is needed.

| What | Tag | Workflow | Release files |
|---|---|---|---|
| Desktop uploader | `uploader-vX.Y.Z` | `build-uploader.yml` | installer (`…-Setup-X.Y.Z.exe`) + portable exe |
| Nexus addon | `vX.Y.Z` (no prefix, see below) | `build-nexus-addon.yml` | `gw2-arcdps-helper.dll` |

1. Commit and push your changes to `main`. The tag builds the commit it points to.
2. Release:

   ```sh
   make release-uploader          # next patch version, e.g. uploader-v1.0.1 -> uploader-v1.0.2
   make release-addon             # next patch version, e.g. v1.0.0 -> v1.0.1
   make release-addon v=1.1.0     # or a version of your choice (must be newer than the latest one)
   ```

   `scripts/release.mjs` first checks that there are no uncommitted changes and that `main` matches GitHub. It then
   creates the tag, pushes it, and prints the Actions and release links. It works from PowerShell, cmd.exe and bash.

   **Or from GitHub, without a terminal:** go to **Actions** → **Build uploader** (or **Build Nexus addon**) →
   **Run workflow** on `main`, tick **release**, and optionally enter a version. That run uses the same script to
   create the tag, then builds and publishes the release itself. A tag pushed by Actions doesn't start another run.
3. Follow the build under **Actions** on GitHub. After a few minutes the release appears under **Releases**, and the
   website links point to it.

Without make, you can tag by hand. In PowerShell, run each command on its own line (Windows PowerShell has no `&&`):
`git tag uploader-v1.2.0`, then `git push origin uploader-v1.2.0` (or `v1.2.0` for the addon).

Notes:

- **You don't edit version numbers by hand.** The uploader's `package.json` version and the addon version shown in
  Nexus are set from the tag at build time. Local builds of the addon report `0.0.0`.
- **A push to `main` without a tag** still builds both, but only as run artifacts (**Actions** → the run →
  **Artifacts**), which is handy for testing before a release.
- **If a tagged build fails,** fix it, push the fix, then move the tag to the new commit:

  ```powershell
  git tag -d v0.2.0
  git push origin :refs/tags/v0.2.0
  git tag v0.2.0
  git push origin v0.2.0
  ```

  A release is only created when the build succeeds, so there is nothing else to clean up.
- **How players get the update:**
  - **Nexus addon:** Nexus updates it (update provider GitHub). It checks this repository's releases when the addon
    loads and then every 30 minutes. With the default update mode ("Automatic"), it downloads the newest DLL and
    reloads the addon. Nexus only understands tags like `v1.2.3`, which is why addon tags have no prefix. It skips
    `uploader-v*` and the old `addon-v0.1.0` / `addon-v0.1.1` releases. Those two can't update themselves, so
    players on them install `v0.1.2` or newer once by hand. Local builds (`0.0.0`) never auto-update.
    Nexus asks the GitHub REST API, which allows 60 requests per hour per IP, shared with every other GitHub-hosted
    addon. If the Nexus log shows "API rate limit exceeded", the check succeeds again after the limit resets.
  - **Uploader (installer version):** updates itself. Shortly after start, and then every 6 hours, it reads the newest
    `uploader-v*` tag from the repository's git refs, which are not subject to the GitHub API rate limit. It then
    downloads that release in the background with electron-updater, which checks the file's
    sha512 against `latest.yml`. A bar offers "Restart and update", and otherwise the update is installed when the
    app quits. The workflow must publish `latest.yml` with the exe, and file names have no spaces because GitHub
    turns spaces into dots. Releases up to `uploader-v0.1.0` can't do this, so install the first version with it by
    hand.
  - **Uploader (portable exe):** can't update itself. It shows a bar with a download link instead.

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
