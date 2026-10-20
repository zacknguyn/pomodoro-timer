-- Execute once as the database/schema owner in your dedicated Pomogit database.
-- Set a unique password separately with psql's \password pomogit_runtime prompt.
CREATE ROLE pomogit_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
