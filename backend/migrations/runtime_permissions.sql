-- Run as the schema owner after initialization and every upgrade, in a dedicated app database.
-- Create pomogit_runtime separately and set its password privately (see deploy/aws/README.md).
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pomogit_runtime'
    AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls)
    OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = 'pomogit_runtime'::regrole)
    OR EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relowner = 'pomogit_runtime'::regrole)
    OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspowner = 'pomogit_runtime'::regrole)
    OR EXISTS (SELECT 1 FROM pg_database WHERE datdba = 'pomogit_runtime'::regrole)
  THEN RAISE EXCEPTION 'Create a dedicated unprivileged pomogit_runtime login without memberships or object ownership first';
  END IF;
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM PUBLIC, pomogit_runtime', current_database());
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM pomogit_runtime;
GRANT USAGE ON SCHEMA public TO pomogit_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM pomogit_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pomogit_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM pomogit_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pomogit_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pomogit_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pomogit_runtime;
COMMIT;
