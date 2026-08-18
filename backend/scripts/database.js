import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pool from '../src/lib/db.js';

const command = process.argv[2];
const file = command === 'init'
  ? resolve('schema.sql')
  : command === 'migrate'
    ? resolve('migrations/001_secure_accounts.sql')
    : command === 'cleanup-legacy'
      ? resolve('migrations/002_remove_legacy_product.sql')
    : null;

if (!file) {
  console.error('Usage: node scripts/database.js <init|migrate|cleanup-legacy>');
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
