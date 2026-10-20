-- Pomogit PostgreSQL schema
-- Initialize a new PostgreSQL database with npm run db:init.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key CHAR(64) PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits > 0 AND hits <= 21),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx ON auth_rate_limits(expires_at);

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT,
  github_id   TEXT UNIQUE,
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

CREATE TABLE IF NOT EXISTS github_login_requests (
  state_hash CHAR(64) PRIMARY KEY,
  verifier TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Account-owned workspace model.
CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  status        TEXT NOT NULL DEFAULT 'inbox'
                  CHECK (status IN ('inbox', 'ready', 'progress', 'done')),
  ready_order   INTEGER NOT NULL DEFAULT 0 CHECK (ready_order >= 0),
  reference_url TEXT,
  project       TEXT NOT NULL DEFAULT '',
  next_step     TEXT NOT NULL DEFAULT '',
  notes         JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(notes) = 'array'),
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

CREATE TABLE IF NOT EXISTS github_projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  UNIQUE(user_id, github_id)
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_issue_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_github_issue_unique ON tasks(user_id, github_issue_id);

-- Better Auth schema and id-preserving credential migration.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  password TEXT,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, account_id)
);
CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts(user_id);

CREATE TABLE IF NOT EXISTS better_auth_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS better_auth_sessions_user_idx ON better_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS better_auth_sessions_expiry_idx ON better_auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_verifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);

-- Preserve immutable user IDs, hashes and GitHub subject IDs. Re-runs never overwrite changed credentials.
INSERT INTO auth_accounts (user_id, account_id, provider_id, password)
  SELECT id, id, 'credential', password FROM users WHERE password IS NOT NULL
  ON CONFLICT (provider_id, account_id) DO NOTHING;
INSERT INTO auth_accounts (user_id, account_id, provider_id)
  SELECT id, github_id, 'github' FROM users WHERE github_id IS NOT NULL
  ON CONFLICT (provider_id, account_id) DO NOTHING;
COMMIT;
