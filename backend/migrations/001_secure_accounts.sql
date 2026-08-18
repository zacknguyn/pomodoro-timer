BEGIN;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE focus_sessions ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

DO $$
DECLARE
  owner_id TEXT;
  account_count INTEGER;
BEGIN
  SELECT COUNT(*), MIN(id) INTO account_count, owner_id FROM users;
  IF EXISTS (SELECT 1 FROM tasks WHERE user_id IS NULL) THEN
    IF account_count = 1 THEN
      UPDATE tasks SET user_id = owner_id WHERE user_id IS NULL;
    ELSE
      RAISE EXCEPTION 'Cannot assign legacy workspace rows: expected exactly one existing user, found %', account_count;
    END IF;
  END IF;
END $$;

UPDATE focus_sessions s SET user_id = t.user_id FROM tasks t
WHERE s.task_id = t.id AND s.user_id IS NULL;
UPDATE checkpoints c SET user_id = t.user_id FROM tasks t
WHERE c.task_id = t.id AND c.user_id IS NULL;

ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE focus_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE checkpoints ALTER COLUMN user_id SET NOT NULL;

DROP INDEX IF EXISTS tasks_status_order_idx;
CREATE INDEX tasks_status_order_idx ON tasks(user_id, status, ready_order, created_at);
DROP INDEX IF EXISTS focus_sessions_one_open_idx;
CREATE UNIQUE INDEX focus_sessions_one_open_idx ON focus_sessions(user_id)
  WHERE status IN ('active', 'paused');

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs(created_at DESC);

COMMIT;
