# GW2 ArcDPS Helper — Docker and migration shortcuts.
# Recipes only use docker/npm/node so they work whether make runs them through sh or cmd.exe.

COMPOSE := docker compose
DB_USER := gw2
DB_NAME := gw2arcdpshelper

.DEFAULT_GOAL := help
.PHONY: help up down restart build rebuild logs ps clean db-up db-shell \
        migrate migrate-status migration migrate-local migrate-prod \
        uploader-install uploader-dev uploader-prod uploader-build uploader-dist \
        addon-build addon-zig

help:
	@echo GW2 ArcDPS Helper make targets:
	@echo   Containers
	@echo     make up              Build if needed and start db, backend and frontend with hot reload - Ctrl+C stops
	@echo     make down            Stop and remove containers - data is kept
	@echo     make restart         down + up
	@echo     make build           Build images
	@echo     make rebuild         Build images without cache, then start
	@echo     make logs            Follow logs of all services
	@echo     make ps              Show container status
	@echo     make clean           Stop containers AND delete the database volume
	@echo   Database / migrations
	@echo     make db-up           Start only the database - for local npm run dev
	@echo     make db-shell        Open psql in the db container
	@echo     make migrate         Rebuild the backend image and apply pending migrations
	@echo     make migrate-status  List applied migrations
	@echo     make migration name=add_something   Generate a migration from changes in backend/src/db/schema.ts
	@echo     make migrate-local   Apply migrations to the local database - backend/.env.development
	@echo     make migrate-prod    Apply migrations to the production database - backend/.env.production
	@echo   Desktop uploader
	@echo     make uploader-install  Install uploader dependencies
	@echo     make uploader-dev      Run the uploader against the local Docker stack - http://localhost:8080
	@echo     make uploader-prod     Run the uploader against production - URLs in uploader/.env.production
	@echo     make uploader-build    Typecheck and build the uploader for production
	@echo     make uploader-dist     Build the production Windows installer and portable exe - uploader/dist
	@echo   Nexus addon - in-game uploader
	@echo     make addon-build       Build nexus-addon with CMake + Visual Studio - nexus-addon/build/Release
	@echo     make addon-zig         Build nexus-addon with zig, no Visual Studio needed - nexus-addon/build

# ---------- containers ----------

# Runs in the foreground: Compose watches the sources and syncs changes into the containers (hot reload).
# --detach cannot be combined with --watch.
up:
	@echo App: http://localhost:8080   API: http://localhost:3000/api
	$(COMPOSE) up --build --watch

down:
	$(COMPOSE) down

restart: down up

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache
	$(COMPOSE) up --watch

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

clean:
	$(COMPOSE) down -v

# ---------- database / migrations ----------

db-up:
	$(COMPOSE) up -d db

db-shell:
	$(COMPOSE) exec db psql -U $(DB_USER) -d $(DB_NAME)

# Migrations are baked into the backend image, so rebuild it first to pick up new .sql files.
migrate:
	$(COMPOSE) build backend
	$(COMPOSE) run --rm backend npx tsx src/db/migrate.ts

migrate-status:
	$(COMPOSE) exec db psql -U $(DB_USER) -d $(DB_NAME) -c "SELECT id, hash, to_timestamp(created_at / 1000) AS created FROM drizzle.__drizzle_migrations ORDER BY id"

migration:
	npm --prefix backend run migration:new -- $(name)

migrate-local:
	npm --prefix backend run migrate

migrate-prod:
	npm --prefix backend run migrate:production

# ---------- desktop uploader ----------

uploader-install:
	npm --prefix uploader install

uploader-dev:
	npm --prefix uploader run dev

uploader-prod:
	npm --prefix uploader run dev:prod

uploader-build:
	npm --prefix uploader run build

uploader-dist:
	npm --prefix uploader run dist

# ---------- nexus addon ----------

# addon-zig needs zig (https://ziglang.org, e.g. `winget install zig.zig`); override the path with `make addon-zig ZIG=...`.
ZIG ?= zig
ADDON := nexus-addon
ADDON_SOURCES := $(wildcard $(ADDON)/src/*.cpp) $(ADDON)/src/resources.rc \
                 $(addprefix $(ADDON)/third_party/imgui/,imgui.cpp imgui_draw.cpp imgui_tables.cpp imgui_widgets.cpp)

addon-build:
	cmake -S $(ADDON) -B $(ADDON)/build -A x64
	cmake --build $(ADDON)/build --config Release

addon-zig:
	node -e "require('fs').mkdirSync('$(ADDON)/build', { recursive: true })"
	$(ZIG) c++ -target x86_64-windows-gnu -shared -std=c++17 -O2 -s -DWIN32_LEAN_AND_MEAN -DNOMINMAX -DUNICODE -D_UNICODE \
		-Wno-nontrivial-memcall -Wno-nullability-completeness -isystem $(ADDON)/third_party -I$(ADDON)/src $(ADDON_SOURCES) -lwinhttp -lcrypt32 -lshell32 -lole32 \
		-o $(ADDON)/build/gw2-arcdps-helper.dll
