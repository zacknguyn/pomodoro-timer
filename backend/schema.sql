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

CREATE TABLE IF NOT EXISTS auth_sessions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  CHAR(64) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent  TEXT,
  ip_address  INET
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

-- Account-owned workspace model.
CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  status        TEXT NOT NULL DEFAULT 'inbox'
                  CHECK (status IN ('inbox', 'ready', 'done')),
  ready_order   INTEGER NOT NULL DEFAULT 0 CHECK (ready_order >= 0),
  reference_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tasks_status_order_idx
  ON tasks(user_id, status, ready_order, created_at);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  ON focus_sessions (user_id)
  WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS focus_sessions_task_idx
  ON focus_sessions(task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS checkpoints (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  session_id   TEXT NOT NULL UNIQUE REFERENCES focus_sessions(id) ON DELETE CASCADE,
  what_changed TEXT,
  next_step    TEXT,
  outcome      TEXT NOT NULL CHECK (outcome IN ('continue', 'complete')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (outcome = 'complete' OR length(btrim(next_step)) > 0)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS checkpoints_task_created_idx
  ON checkpoints(task_id, created_at DESC);
