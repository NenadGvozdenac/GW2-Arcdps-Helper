# GW2 ArcDPS Helper Uploader

Windows desktop app (Electron + React + TypeScript) that watches your ArcDPS log folder, uploads every new
`.zevtc` to [dps.report](https://dps.report) and saves it to your GW2 ArcDPS Helper account, where it shows up in the
web app (raids / fractals / strikes pages).

It replaces the old Java `AutoLogUploader`; Discord posting was intentionally dropped.

## How it works

1. Sign in with your GW2 ArcDPS Helper account.
2. Pick the ArcDPS folder (`Documents\Guild Wars 2\addons\arcdps\arcdps.cbtlogs` is detected automatically).
3. Press **Start watching** (or enable *Start watching automatically* in Settings).
4. For each new log: wait until ArcDPS finished writing → upload to dps.report (3 attempts on network errors)
   → `POST /api/logs` with the permalink → the backend stores it for the web app.

Logs that fail to upload are not shown in the list.
While watching, closing the window keeps the app running in the tray.

## Updates

The installed app updates itself (`src/main/services/updateService.ts`, packaged builds only). About 10 seconds after
start, and then every 6 hours, it reads the newest `uploader-vX.Y.Z` tag from the repository's git refs
(`…/info/refs`, the endpoint `git fetch` uses). It avoids the REST API on purpose: that allows only 60 requests/hour
per IP, shared with Nexus' update checks and the website. If the tag is newer, the app points electron-updater at
that release, which reads its `latest.yml`, downloads the setup exe in the background and checks its sha512. A bar at
the top then offers **Restart and update**; otherwise the update is installed silently when the app quits. The
portable exe can't update itself, so it only shows a link to the release page.

GitHub's "latest release" can't be used, because the Nexus addon (`vX.Y.Z` tags) is released from the same
repository. Artifact names have no spaces, because GitHub turns spaces into dots and `latest.yml` must name the
exact file.

## Structure

```
src/
├── shared/          types + IPC channel names used by main, preload and renderer
├── main/            Electron main process (Node)
│   ├── config/      constants
│   ├── types/       main-only types
│   ├── repositories/ JSON files in %APPDATA%\gw2-arcdps-helper-uploader (settings, credentials, upload history)
│   ├── services/    auth, settings, folder watching, upload pipeline, notifications, state store
│   │   └── clients/ dps.report and GW2 ArcDPS Helper backend clients
│   ├── ipc/         IPC handlers exposed to the renderer
│   ├── i18n/        tray / notification strings (en, sr)
│   └── index.ts, window.ts, tray.ts
├── preload/         contextBridge → window.uploader (the renderer is sandboxed)
└── renderer/        React UI
    └── src/
        ├── i18n/            en.ts (source of truth) + sr.ts
        ├── repositories/    uploaderBridge (window.uploader)
        ├── controllers/     AppStateController (state pushed from main), I18nController
        └── presentation/    pages, components (hooks colocated), styles
```

The sign-in token is encrypted with Windows DPAPI (Electron `safeStorage`). Logs are written to
`%APPDATA%\gw2-arcdps-helper-uploader\logs`.

## Environments

The server URLs are not editable in the app; they are baked in at build time from
`.env.development` / `.env.production` (`MAIN_VITE_API_URL`, `MAIN_VITE_WEB_URL`).

| Command | Make target | Server |
|---|---|---|
| `npm run dev` | `make uploader-dev` | local Docker stack (`http://localhost:8080`), shows a **DEV** badge |
| `npm run dev:prod` | `make uploader-prod` | production URLs from `.env.production` |
| `npm run build` / `dist` | `make uploader-build` / `uploader-dist` | always production |

Development runs use their own profile (`%APPDATA%\gw2-arcdps-helper-uploader-dev`), so dev sign-in, settings and
upload history never mix with the production app. A saved sign-in for a different server is discarded on start.

**Before building a release, put your real Vercel URLs into `.env.production`.**

## Commands

```sh
npm install
npm run dev         # hot reload, local backend
npm run dev:prod    # hot reload, production backend
npm run build       # typecheck + production build to out/
npm run dist        # production Windows installer + portable exe in dist/
npm run dist:dir    # unpacked production app in dist/win-unpacked (quick check)
```

## Automatic builds (GitHub Actions)

`.github/workflows/build-uploader.yml` builds the production installer and portable exe on a Windows runner:

- every push to `main` that touches `uploader/` (or *Actions → Build uploader → Run workflow*): the `.exe` files
  are attached to the run as the `gw2-arcdps-helper-uploader` artifact;
- a tag `uploader-vX.Y.Z` (`git tag uploader-v0.2.0 && git push origin uploader-v0.2.0`): the app is built as
  version `X.Y.Z` and published as a GitHub Release with both `.exe` files.

The workflow writes `.env.production` itself. Override the URLs with the repository variables `UPLOADER_API_URL`
and `UPLOADER_WEB_URL` (Settings → Secrets and variables → Actions → Variables).

Set `GW2_UPLOADER_USER_DATA=<folder>` to use a specific profile folder (e.g. for tests).

> Running from a terminal inside Claude Code / some tools sets `ELECTRON_RUN_AS_NODE=1`, which makes
> Electron start as plain Node (`Cannot read properties of undefined (reading 'setPath')`). Unset it first.
