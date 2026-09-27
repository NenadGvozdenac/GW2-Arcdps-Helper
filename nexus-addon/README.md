# GW2 ArcDPS Helper — Nexus addon

A small in-game version of the [desktop uploader](../uploader/README.md), built as a
[Nexus](https://raidcore.gg/Nexus) addon (`gw2-arcdps-helper.dll`). It watches the ArcDPS log folder, uploads every
new log to dps.report, saves it to your GW2 ArcDPS Helper account, and lets you **record** sessions without leaving
the game.

## In game

- **Window**: `ALT+SHIFT+U` or the icon in the Nexus quick-access bar. `Esc` closes it.
  - **Record** starts a session on GW2 ArcDPS Helper. Every new log is attached to it. **Stop recording** waits
    for the session's pending uploads and then ends it, so the Discord summary contains all of them.
  - **Auto-upload new logs** turns the folder watcher on or off. Recording turns it on.
  - The list shows the recent logs. Click a boss to open the dps.report link, right-click to copy it, and use
    **Retry** on failed uploads. If a log already reached dps.report, Retry repeats only the GW2 ArcDPS Helper step.
- **Options** (Nexus → Addons → GW2 ArcDPS Helper): sign in, the ArcDPS log folder, the dps.report user token,
  alerts, and the API URL (under *Advanced*).
- **Keybinds** (Nexus → Keybinds): toggle the window, and toggle recording (unbound by default).

Without signing in the addon still uploads to dps.report ("dps.report only" in the list). Recording needs an
account.

## How it works

```
src/
├── entry.cpp     Nexus entry point: GetAddonDef, load/unload, keybinds, quick-access icon, alert queue
├── ui.cpp        ImGui window + options (ImGui 1.80, the version Nexus runs)
├── uploads.cpp   upload queue on one worker thread: wait until ArcDPS finished writing -> dps.report (3 attempts)
│                 -> POST /api/logs (with the session id while recording); history in uploads.json
├── account.cpp   sign-in and sessions on their own thread; re-checks the active session every minute
├── watcher.cpp   ReadDirectoryChangesW on the log folder (recursive: ArcDPS uses one folder per boss)
├── api.cpp       dps.report + GW2 ArcDPS Helper clients (the same endpoints the desktop uploader uses)
├── http.cpp      blocking WinHTTP requests; CancelAll() aborts them on unload so threads join quickly
├── settings.cpp  settings.json
└── util.cpp      UTF-8/UTF-16, DPAPI, clipboard, files
third_party/      ImGui 1.80 (RaidcoreGG fork, same commit as the Nexus template), Nexus.h, nlohmann/json
resources/        quick-access icons (embedded into the DLL)
```

Network and file I/O never run on the render thread. Worker threads stop on unload (hot reloading works).

Files are stored in `<GW2>\addons\GW2ArcDPSHelper\`: `settings.json`, where the sign-in token is encrypted with
Windows DPAPI, and `uploads.json`, which keeps the last 50 finished uploads.

> Do not run the addon and the desktop uploader at the same time, or every log is uploaded twice.

## Build

Pick one of these:

| Command | Needs | Output |
|---|---|---|
| `make addon-build` | Visual Studio 2022 (C++ workload) + CMake | `nexus-addon/build/Release/gw2-arcdps-helper.dll` |
| `make addon-zig` | [zig](https://ziglang.org) (`winget install zig.zig`), nothing else | `nexus-addon/build/gw2-arcdps-helper.dll` |
| GitHub Actions *Build Nexus addon* | nothing | DLL as a run artifact; tag `addon-vX.Y.Z` publishes a Release |

The official build is the MSVC one. The zig build is handy when Visual Studio is not installed.

## Install

1. Install [Nexus](https://raidcore.gg/Nexus) (and ArcDPS, which writes the logs).
2. Copy `gw2-arcdps-helper.dll` to `<Guild Wars 2>\addons\`.
3. In game, open Nexus → Addons, enable **GW2 ArcDPS Helper**, and sign in under its options.
