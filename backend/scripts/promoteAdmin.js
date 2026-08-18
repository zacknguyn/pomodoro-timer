import 'dotenv/config';
import pool from '../src/lib/db.js';
import userRepository from '../src/repositories/userRepository.js';
import authSessionRepository from '../src/repositories/authSessionRepository.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:promote -- you@example.com');
  process.exitCode = 2;
} else {
  try {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Register the account before promoting it');
    await userRepository.setRole(user.id, 'superadmin');
    await authSessionRepository.revokeAllForUser(user.id);
    console.log('Superadmin role applied. Sign in again.');
  } catch (error) {
    console.error(`Promotion failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
