// Keep deployment mistakes out of the request path. Never include env values in errors.
export function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const fail = message => { throw new Error(`Production configuration: ${message}`); };
  if (!env.RUNTIME_DATABASE_ROLE && (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)) {
    fail('Set a private random BETTER_AUTH_SECRET with at least 32 characters.');
  }
  function url(value, name) {
    try { return new URL(value); } catch { fail(`${name} must be a valid URL.`); }
  }
  const frontend = url(env.FRONTEND_URL, 'FRONTEND_URL');
  if (frontend.protocol !== 'https:' || frontend.origin !== env.FRONTEND_URL) {
    fail('FRONTEND_URL must be an exact HTTPS origin, without a path or trailing slash.');
  }
  const api = env.API_URL ? url(env.API_URL, 'API_URL') : frontend;
  if (api.protocol !== 'https:' || (env.API_URL && api.origin !== env.API_URL)) {
    fail('API_URL must be an exact HTTPS origin, without credentials, path or trailing slash.');
  }
  const database = url(env.DATABASE_URL, 'DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || database.pathname.length < 2 || database.hash) {
    fail('DATABASE_URL must specify a PostgreSQL host and database.');
  }
  // pg lets connection-string parameters replace the explicit SSL object, including its CA.
  if (database.search) fail('Remove DATABASE_URL query parameters; configure TLS with DATABASE_SSL and DATABASE_CA_CERT.');
  if (env.DATABASE_SSL && !['true', 'false'].includes(env.DATABASE_SSL)) fail('DATABASE_SSL must be true or false.');
  if (env.DATABASE_SSL === 'false' && !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
    fail('DATABASE_SSL=false is allowed only for a loopback database.');
  }
  if (env.DEV_BYPASS_AUTH && env.DEV_BYPASS_AUTH !== 'false') fail('DEV_BYPASS_AUTH must be false.');
  const github = [env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, env.GITHUB_CALLBACK_URL];
  if (github.some(Boolean)) {
    if (!github.every(Boolean)) fail('Set all three GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and GITHUB_CALLBACK_URL, or leave all unset.');
    if (env.GITHUB_CALLBACK_URL !== `${api.origin}/api/auth/github/callback`) {
      fail('GITHUB_CALLBACK_URL must use the API origin followed by /api/auth/github/callback.');
    }
  }
}
