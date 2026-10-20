CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key CHAR(64) PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits > 0 AND hits <= 21),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx ON auth_rate_limits(expires_at);
