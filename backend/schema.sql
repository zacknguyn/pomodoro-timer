-- Pomogit PostgreSQL schema
-- Run once against your RDS instance: psql $DATABASE_URL -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  display_name TEXT,
  bio         TEXT,
  avatar_style TEXT NOT NULL DEFAULT 'thumbs',
  banned      BOOLEAN NOT NULL DEFAULT false,
  role        TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin' | 'superadmin'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pomodoro      INTEGER NOT NULL DEFAULT 25,
  short_break   INTEGER NOT NULL DEFAULT 5,
  long_break    INTEGER NOT NULL DEFAULT 15,
  github_token  TEXT,
  github_username TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL,
  duration     INTEGER NOT NULL,
  intent       TEXT,
  repo_name    TEXT,
  note         TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_completed_at_idx ON sessions(completed_at);

CREATE TABLE IF NOT EXISTS groups (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT NOT NULL,
  repo_full_name TEXT UNIQUE NOT NULL,
  owner_id       TEXT NOT NULL REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id  TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_notes (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MVP workspace model. These tables intentionally coexist with the legacy
-- account/session tables above while the local-first product is rebuilt.
CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title         TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  status        TEXT NOT NULL DEFAULT 'inbox'
                  CHECK (status IN ('inbox', 'ready', 'done')),
  ready_order   INTEGER NOT NULL DEFAULT 0 CHECK (ready_order >= 0),
  reference_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_status_order_idx
  ON tasks(status, ready_order, created_at);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id                  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at                 TIMESTAMPTZ,
  duration_planned_seconds INTEGER NOT NULL CHECK (duration_planned_seconds > 0),
  duration_actual_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (duration_actual_seconds >= 0),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'ended')),
  deadline_at              TIMESTAMPTZ,
  remaining_seconds        INTEGER NOT NULL CHECK (remaining_seconds >= 0),
  CHECK (
    (status = 'active' AND deadline_at IS NOT NULL AND ended_at IS NULL)
    OR (status = 'paused' AND deadline_at IS NULL AND ended_at IS NULL)
    OR (status = 'ended' AND deadline_at IS NULL AND ended_at IS NOT NULL)
  )
);

-- A paused session is still the current session. This stronger invariant
-- prevents starting another task merely by pausing the first one.
CREATE UNIQUE INDEX IF NOT EXISTS focus_sessions_one_open_idx
  ON focus_sessions ((TRUE))
  WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS focus_sessions_task_idx
  ON focus_sessions(task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS checkpoints (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  session_id   TEXT NOT NULL UNIQUE REFERENCES focus_sessions(id) ON DELETE CASCADE,
  what_changed TEXT,
  next_step    TEXT,
  outcome      TEXT NOT NULL CHECK (outcome IN ('continue', 'complete')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (outcome = 'complete' OR length(btrim(next_step)) > 0)
);

CREATE INDEX IF NOT EXISTS checkpoints_task_created_idx
  ON checkpoints(task_id, created_at DESC);
