import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pool from '../src/lib/db.js';

const command = process.argv[2];
const file = command === 'init'
  ? resolve('schema.sql')
  : command === 'migrate'
    ? resolve('migrations/001_secure_accounts.sql')
    : command === 'workspace'
      ? resolve('migrations/003_workspace_details.sql')
    : command === 'github'
      ? resolve('migrations/004_github_login.sql')
    : command === 'projects'
      ? resolve('migrations/005_github_projects.sql')
    : command === 'auth'
      ? resolve('migrations/007_better_auth.sql')
    : command === 'auth-limits'
      ? resolve('migrations/006_auth_rate_limits.sql')
    : command === 'cleanup-legacy'
      ? resolve('migrations/002_remove_legacy_product.sql')
    : null;

if (!file) {
  console.error('Usage: node scripts/database.js <init|migrate|workspace|github|projects|auth|auth-limits|cleanup-legacy>');
  process.exitCode = 2;
} else {
  try {
    await pool.query(await readFile(file, 'utf8'));
    console.log(`Database ${command} completed`);
  } catch (error) {
    console.error(`Database ${command} failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
