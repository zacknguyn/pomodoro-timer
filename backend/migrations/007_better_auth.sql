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
