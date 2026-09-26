CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  gw2_account   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permalink              TEXT NOT NULL,
  url                    TEXT NOT NULL,
  boss_name              TEXT NOT NULL,
  boss_icon              TEXT,
  trigger_id             INTEGER,
  encounter_key          TEXT,
  group_id               TEXT,
  category               TEXT NOT NULL,
  success                BOOLEAN NOT NULL,
  is_cm                  BOOLEAN NOT NULL DEFAULT false,
  is_legendary_cm        BOOLEAN NOT NULL DEFAULT false,
  duration_ms            INTEGER NOT NULL,
  boss_health_left       REAL,
  encounter_time         TIMESTAMPTZ NOT NULL,
  recorded_by            TEXT,
  gw2_build              INTEGER,
  elite_insights_version TEXT,
  players                JSONB NOT NULL DEFAULT '[]'::jsonb,
  accounts               TEXT[] NOT NULL DEFAULT '{}',
  uploaded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, permalink)
);

CREATE INDEX IF NOT EXISTS logs_owner_time_idx ON logs (owner_id, encounter_time DESC);
