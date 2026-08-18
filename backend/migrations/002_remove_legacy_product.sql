BEGIN;

-- Destructive by design: run only after backing up any pre-rebrand data that
-- must be retained. These tables are not used by the current Pomogit runtime.
DROP TABLE IF EXISTS group_notes;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS settings;

COMMIT;
