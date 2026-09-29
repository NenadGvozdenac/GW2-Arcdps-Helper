# GW2 ArcDPS Helper — Web app

React web app for GW2 ArcDPS Helper: sign in, paste dps.report links, and track raid wings, fractal CMs and strikes
(weekly/daily clears, kills, wipes, best times, per-log player DPS).

**React 19 + TypeScript + Vite + React Router**, styled with **shadcn/ui** (Radix + Tailwind CSS v4, dark "neutral"
theme — the React counterpart of spartan.ng). English and Serbian UI.

Talks to the backend in `../backend`; logs sent by the desktop uploader (`../uploader`) show up automatically.

## Quick start

```sh
npm install
npm run dev        # http://localhost:5173 — /api is proxied to http://localhost:3000
```

The backend must be running (`npm --prefix ../backend run dev`, or `make up` from the repo root, which also serves
this app at http://localhost:8080).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with `.env.development` |
| `npm run build` | Typecheck + production build to `dist/` (`.env.production`, used by Vercel) |
| `npm run build:local` | Typecheck + build with `.env.development` (used by the Docker image → calls `/api`) |
| `npm run preview` | Serve the last build locally |
| `npm run typecheck` | `tsc -b` |

## Environment

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL, e.g. `https://<backend>.vercel.app/api`. Empty → same-origin `/api` |

| File | Used by | In git |
|---|---|---|
| `.env.development` | `npm run dev`, `npm run build:local` / Docker (`VITE_API_URL` empty) | yes |
| `.env.production` | `npm run build` on your machine | **no** — copy `.env.production.example` |

On Vercel, set `VITE_API_URL` in the project's Environment Variables (the file is not in git). Values are baked in
at build time.

## Architecture

```
src/
├── main.tsx           providers (I18n → Auth → Logs) + router
├── config/            constants (API URL, page size, refresh interval, storage keys)
├── i18n/              locales/en.ts (source of truth), locales/sr.ts, translate()
├── domain/
│   ├── types/         all TypeScript types (Log, User, API errors, …)
│   └── data/          encounter catalogue (wings, fractal CMs, strikes)
├── repositories/      HTTP client and API calls
├── storage/           what is kept in the browser (localStorage): JWT, language, logs per page
├── services/          business logic without React (auth, logs, stats, encounters, profile, language)
├── controllers/       app-wide React providers: I18nController, AuthController, LogsController, SessionsController
├── hooks/             reusable React hooks without state of their own (usePolling)
└── presentation/
    ├── AppRouter.tsx  routes + auth guards
    ├── pages/         one file per page; its `useXxxController` hook lives in the same file
    ├── components/    shared components (+ ui/ = shadcn/ui primitives)
    ├── lib/utils.ts   cn() class-name helper
    ├── utils/         formatting, error translation, profession colours
    └── styles.css     Tailwind + theme tokens
```

Dependency direction: `presentation → controllers → services → repositories / storage → config`. Pages and components
never call `fetch` or `localStorage` directly.

### Data flow

- **Auth:** `AuthController` restores the session on load (`GET /auth/me` with the stored token) and exposes
  `login`, `register`, `logout`, `updateProfile`. The JWT is kept in `localStorage` (`gw2arcdpshelper.token`).
- **Logs:** `LogsController` loads all of the user's logs once and shares them with every page. It re-fetches every
  30 s while the tab is visible and immediately when you return to the tab; logs that appeared since the previous
  refresh are briefly highlighted. "All logs" doesn't use that list: it asks the server for one page (20) at a time,
  searched and filtered there (`GET /logs/search`).
- **Sessions:** `SessionsController` loads the user's sessions and their actions (rename, pin, share, resume, move,
  delete), polling like the logs. The "Sessions" page is drawn right away from the sessions and logs already loaded,
  then replaced by the server's page (10 at a time, each session's kills / wipes / duration added up —
  `GET /sessions/page`).
- **Stats:** raid/fractal/strike pages derive everything client-side with `statsService` (kills, wipes, best time,
  cleared since the weekly reset — Monday 07:30 UTC — or the daily reset for fractals).
- **Errors:** services throw `ValidationError` (translation key) or `ApiError` (backend `code`);
  `presentation/utils/describeError` turns them into a message in the current language.

## Pages

| Route | Page |
|---|---|
| `/login`, `/register`, `/forgot-password` | Sign in / create an account (then "check your inbox") / request a password-reset email (guests only) |
| `/verify-email?token=…` | Link from the confirmation email: confirms the address and signs in |
| `/reset-password?token=…` | Link from the password-reset email: new password, then signed in |
| `/` | Overview: totals, weekly/daily clear per wing/fractal/strike, recent logs |
| `/raids`, `/fractals`, `/strikes` | Every group and boss with kills/wipes/best time; Normal/CM filter; `?boss=<key>` opens a boss |
| `/logs` | All logs with search, category/group/result filters |
| `/logs/:id` | Log detail: result, duration, squad DPS, player table (your account highlighted), delete |
| `/upload` | Paste dps.report links (batched 10 per request) |
| `/profile` | Display name and GW2 account |

## Localization

`useI18n()` returns `t(key, params)`, the current `lang`, `setLang` and locale-aware formatters (`fmt.date`,
`fmt.number`, …). Add a key to `i18n/locales/en.ts` first — `sr.ts` is typed against it, so a missing key fails the
build. Boss/wing names stay in English. The language is stored in `localStorage` and defaults to the browser's.

## UI components

shadcn/ui primitives live in `presentation/components/ui` (configured in `components.json`). Add one with:

```sh
npx shadcn@latest add <component>
```

On Windows the CLI sometimes writes `import { cn } from "cn"` and installs a bogus `cn` package — change the import
to `@/presentation/lib/utils` and run `npm uninstall cn`. Theme colours (incl. `success`, `warning`, `cm`) are CSS
variables in `presentation/styles.css`.

## Deployment

- **Docker:** `Dockerfile` builds with `build:local` and serves `dist/` with nginx (`nginx.conf`: SPA fallback,
  long-cache for `/assets`, `/api` proxied to the `backend` container).
- **Vercel:** project with Root Directory `frontend`; `vercel.json` sets the Vite build and SPA rewrite. Pushes to
  `main` that touch `frontend/` are deployed by `.github/workflows/deploy-web.yml` — see the root README for the
  one-time setup (secrets, `VITE_API_URL`).
