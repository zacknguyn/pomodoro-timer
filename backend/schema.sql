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
