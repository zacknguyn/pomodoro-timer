BEGIN;
CREATE TABLE IF NOT EXISTS github_projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  UNIQUE(user_id, github_id)
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_issue_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_github_issue_unique ON tasks(user_id, github_issue_id);
COMMIT;
