import crypto from 'node:crypto';
import { z } from 'zod';
import pool from '../lib/db.js';
import { ApiError } from '../lib/workspaceApi.js';
import { hashSessionToken } from '../repositories/authSessionRepository.js';
import authService from './authService.js';

export const GITHUB_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-pomogit_github' : 'pomogit_github';

function configuration() {
  const { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: clientSecret, GITHUB_CALLBACK_URL: callbackUrl } = process.env;
  if (!clientId || !clientSecret || !callbackUrl) {
    throw new ApiError(503, 'GitHub sign-in is not configured yet. Use email for now; the app owner needs to configure a GitHub OAuth App.', 'github_not_configured');
  }
  const callback = new URL(callbackUrl);
  if (callback.username || callback.password || callback.search || callback.hash || callback.pathname !== '/api/auth/github/callback'
    || (callback.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && callback.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(callback.hostname)))) {
    throw new ApiError(503, 'GitHub sign-in callback is not configured correctly.', 'github_not_configured');
  }
  return { clientId, clientSecret, callbackUrl };
}

async function githubJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json', 'User-Agent': 'Pomogit', ...options.headers } });
    if (!response.ok) throw new Error('Provider rejected request');
    return await response.json();
  } catch {
    throw new ApiError(502, 'GitHub could not complete sign-in. Please try again.', 'github_unavailable');
  }
}

export async function startGithubLogin() {
  const { clientId, callbackUrl } = configuration();
  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await pool.query('DELETE FROM github_login_requests WHERE expires_at < NOW()');
  await pool.query('INSERT INTO github_login_requests (state_hash, verifier, expires_at) VALUES ($1, $2, $3)', [hashSessionToken(state), verifier, expiresAt]);
  const authorization = new URL('https://github.com/login/oauth/authorize');
  authorization.search = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl, scope: 'user:email', state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  return { authorizationUrl: authorization.href, state, expiresAt };
}

export async function finishGithubLogin(query, cookieState, context) {
  const input = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: z.string().min(1).max(512).optional(), error: z.string().max(200).optional() }).parse(query);
  if (!cookieState || input.state !== cookieState) throw new ApiError(400, 'GitHub sign-in expired. Please try again.', 'github_state_invalid');
  const { rows: [request] } = await pool.query('DELETE FROM github_login_requests WHERE state_hash = $1 RETURNING verifier, expires_at', [hashSessionToken(input.state)]);
  if (!request || new Date(request.expires_at) <= new Date()) throw new ApiError(400, 'GitHub sign-in expired. Please try again.', 'github_state_invalid');
  if (input.error || !input.code) throw new ApiError(400, 'GitHub sign-in was cancelled.', 'github_cancelled');
  const { clientId, clientSecret, callbackUrl } = configuration();
  const token = await githubJson('https://github.com/login/oauth/access_token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: input.code, redirect_uri: callbackUrl, code_verifier: request.verifier }).toString(),
  });
  if (typeof token.access_token !== 'string' || !token.access_token || token.error) throw new ApiError(502, 'GitHub could not complete sign-in.', 'github_unavailable');
  const headers = { Authorization: `Bearer ${token.access_token}` };
  const identity = await githubJson('https://api.github.com/user', { headers });
  if (!Number.isSafeInteger(identity.id) || identity.id <= 0 || typeof identity.login !== 'string' || !/^[a-z\d-]{1,39}$/i.test(identity.login)) throw new ApiError(502, 'GitHub returned an invalid account.', 'github_unavailable');
  // GitHub's immutable numeric ID owns the account. Email alone never links accounts.
  const { rows: [existing] } = await pool.query('SELECT * FROM users WHERE github_id = $1', [String(identity.id)]);
  let user = existing;
  if (!user) {
    const emails = await githubJson('https://api.github.com/user/emails', { headers });
    const primary = Array.isArray(emails) && emails.find(email => email.primary && email.verified && z.string().email().max(254).safeParse(email.email).success);
    if (!primary) throw new ApiError(400, 'Add a verified primary email to your GitHub account before signing in.', 'github_email_required');
    try {
      const { rows: [created] } = await pool.query(
        `INSERT INTO users (email, password, github_id, display_name) VALUES ($1, NULL, $2, $3)
         ON CONFLICT (github_id) DO UPDATE SET github_id = EXCLUDED.github_id RETURNING *`,
        [primary.email.toLowerCase(), String(identity.id), identity.login]
      );
      user = created;
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'users_email_key') throw new ApiError(409, 'This email already has a Pomogit account. Log in with email; GitHub account linking is not available yet.', 'github_email_taken');
      throw error;
    }
  }
  if (user.banned) throw new ApiError(403, 'This account is suspended.', 'github_suspended');
  // Provider tokens are used only during sign-in and are never stored or sent to the browser.
  return authService.startSession(user, context);
}
