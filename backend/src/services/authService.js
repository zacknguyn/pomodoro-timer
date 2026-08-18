import crypto from 'node:crypto';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import userRepository from '../repositories/userRepository.js';
import authSessionRepository, { hashSessionToken } from '../repositories/authSessionRepository.js';

const SESSION_TTL_HOURS = Math.min(720, Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 168));

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role ?? 'user' };
}

export class AuthService {
  async hashPassword(password) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(storedHash, password) {
    if (storedHash.startsWith('$argon2')) return argon2.verify(storedHash, password);
    return bcrypt.compare(password, storedHash);
  }

  async register(email, password, context = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await userRepository.findByEmail(normalizedEmail)) {
      const error = new Error('An account with this email already exists');
      error.status = 409;
      throw error;
    }
    const user = await userRepository.create({ email: normalizedEmail, password: await this.hashPassword(password) });
    return this.startSession(user, context);
  }

  async login(email, password, context = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    const valid = user ? await this.verifyPassword(user.password, password) : false;
    if (!user || !valid) {
      const error = new Error('Email or password is incorrect');
      error.status = 401;
      throw error;
    }
    if (user.banned) {
      const error = new Error('This account is suspended');
      error.status = 403;
      throw error;
    }
    if (!user.password.startsWith('$argon2')) {
      await userRepository.setPassword(user.id, await this.hashPassword(password));
    }
    return this.startSession(user, context);
  }

  async startSession(user, { userAgent, ipAddress } = {}) {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
    await authSessionRepository.create({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
      userAgent,
      ipAddress,
    });
    return { token, expiresAt, user: publicUser(user) };
  }

}

export default new AuthService();
