export async function verifyRuntimeRole(pool) {
  const { rows: [role] } = await pool.query(`SELECT current_user = 'pomogit_runtime'
    AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls
    AND NOT has_schema_privilege(current_user, 'public', 'CREATE')
    AND NOT has_database_privilege(current_user, current_database(), 'CREATE')
    AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relowner = r.oid)
    AS restricted FROM pg_roles r WHERE rolname = current_user`)
  if (!role?.restricted) throw Error('Runtime role has excessive permissions')
}

export async function verifyMigrationRole(pool) {
  const { rows: [role] } = await pool.query(`SELECT current_user <> 'pomogit_runtime'
    AND has_schema_privilege(current_user, 'public', 'CREATE')
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace
      AND NOT pg_has_role(current_user, relowner, 'USAGE')) AS can_migrate`)
  if (!role?.can_migrate) throw Error('Migration login must own the schema objects')
}
