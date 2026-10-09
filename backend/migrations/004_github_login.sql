BEGIN;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_github_id_key ON users(github_id);
CREATE TABLE IF NOT EXISTS github_login_requests (
  state_hash CHAR(64) PRIMARY KEY,
  verifier TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
COMMIT;
