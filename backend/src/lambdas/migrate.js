import { readFile } from 'node:fs/promises';
import pool from '../lib/db.js';

// Invoked by an authenticated deployment operator; never routed through API Gateway.
export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!['init', 'upgrade'].includes(event?.mode)) throw new Error('Choose init or upgrade.');
  if (process.env.RUNTIME_DATABASE_ROLE && process.env.RUNTIME_DATABASE_ROLE !== 'pomogit_runtime') throw new Error('Unsupported runtime database role.');
  const files = event.mode === 'init' ? ['../../schema.sql'] : [
    '../../migrations/001_secure_accounts.sql', '../../migrations/003_workspace_details.sql',
    '../../migrations/004_github_login.sql', '../../migrations/005_github_projects.sql',
    '../../migrations/006_auth_rate_limits.sql', '../../migrations/007_better_auth.sql',
  ];
  if (event.mode === 'init') {
    const { rows } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if (rows.length) throw new Error('Initialization requires an empty database. Use upgrade for an existing workspace.');
  }
  try {
    for (const file of files) await pool.query(await readFile(new URL(file, import.meta.url), 'utf8'));
    if (process.env.RUNTIME_DATABASE_ROLE) {
      await pool.query(await readFile(new URL('../../migrations/runtime_permissions.sql', import.meta.url), 'utf8'));
    }
  } catch (error) {
    // A failed SQL file may leave a transaction aborted on the reused warm connection.
    await pool.query('ROLLBACK');
    throw error;
  }
  return { status: 'complete', mode: event.mode };
}
