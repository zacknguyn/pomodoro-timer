import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import pool from './db.js';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-pomogit_session' : 'pomogit_session';
let auth;
const devSecret = randomBytes(48).toString('base64url');
const fields = { userId: 'user_id', createdAt: 'created_at', updatedAt: 'updated_at' };
const stripProviderTokens = data => ({ data: { ...data, accessToken: null, refreshToken: null, idToken: null } });

export function getAuth() {
  if (auth) return auth;
  const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
  const production = process.env.NODE_ENV === 'production';
  auth = betterAuth({
    appName: 'Pomogit', baseURL: process.env.API_URL || origin, basePath: '/api/auth',
    secret: process.env.BETTER_AUTH_SECRET || (production ? undefined : devSecret),
    database: pool,
    trustedOrigins: [origin],
    // Existing shared PostgreSQL limiter protects every exposed sign-in entry point.
    rateLimit: { enabled: false },
    logger: { disabled: true }, telemetry: { enabled: false },
    user: {
      modelName: 'users',
      fields: { ...fields, name: 'display_name', emailVerified: 'email_verified', image: 'avatar_url' },
      additionalFields: {
        role: { type: 'string', defaultValue: 'user', input: false },
        banned: { type: 'boolean', defaultValue: false, input: false },
      },
      validateUserInfo: async ({ user, source }) => {
        if (source.method === 'oauth' && !user.emailVerified) return { error: 'github_email_required' };
      },
    },
    session: {
      modelName: 'better_auth_sessions',
      fields: { ...fields, expiresAt: 'expires_at', ipAddress: 'ip_address', userAgent: 'user_agent' },
      expiresIn: Math.min(720, Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 168)) * 3600,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: 'auth_accounts',
      fields: { ...fields, accountId: 'account_id', providerId: 'provider_id', accessToken: 'access_token', refreshToken: 'refresh_token', idToken: 'id_token', accessTokenExpiresAt: 'access_token_expires_at', refreshTokenExpiresAt: 'refresh_token_expires_at' },
      accountLinking: { enabled: false }, storeStateStrategy: 'database', storeAccountCookie: false,
    },
    verification: { modelName: 'auth_verifications', fields: { createdAt: 'created_at', updatedAt: 'updated_at', expiresAt: 'expires_at' } },
    emailAndPassword: {
      enabled: true, minPasswordLength: 12, maxPasswordLength: 128,
      password: {
        hash: password => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
        verify: ({ hash, password }) => hash.startsWith('$argon2') ? argon2.verify(hash, password) : bcrypt.compare(password, hash),
      },
    },
    socialProviders: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET,
        // Preserve the registered OAuth App callback while delegating it to Better Auth.
        redirectURI: process.env.GITHUB_CALLBACK_URL,
        disableDefaultScope: true, scope: ['user:email'],
        mapProfileToUser: profile => ({ name: profile.login }),
      },
    } : {},
    advanced: {
      database: { generateId: () => randomUUID() },
      // Supply the full __Host- name ourselves; avoid Better Auth prepending __Secure-.
      useSecureCookies: false,
      defaultCookieAttributes: { secure: production, httpOnly: true, sameSite: 'lax', path: '/' },
      cookies: { session_token: { name: SESSION_COOKIE } },
      ipAddress: { ipAddressHeaders: ['x-pomogit-client-ip'] },
    },
    databaseHooks: {
      account: { create: { before: stripProviderTokens }, update: { before: stripProviderTokens } },
      session: { create: { before: async (session, context) => {
        const user = await context.context.internalAdapter.findUserById(session.userId);
        if (!user || user.banned) throw new APIError('FORBIDDEN', { message: 'This account is suspended.', code: 'github_suspended' });
        return { data: session };
      } } },
    },
  });
  return auth;
}

// Only selected request headers reach the auth library. Client forwarding headers cannot set its IP.
export function authHeaders(req) {
  const headers = new Headers();
  for (const name of ['cookie', 'origin', 'user-agent']) if (req.get(name)) headers.set(name, req.get(name));
  // Local CLI/tests may omit Origin; Express already rejects any supplied foreign origin.
  if (!headers.has('origin') && process.env.NODE_ENV !== 'production') headers.set('origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  const ip = process.env.AWS_LAMBDA_FUNCTION_NAME ? req.socket.remoteAddress : req.ip;
  if (ip) headers.set('x-pomogit-client-ip', ip);
  return headers;
}
