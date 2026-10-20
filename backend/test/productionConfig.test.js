import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/lib/productionConfig.js';

test('production rejects unsafe or inconsistent deployment configuration without leaking values', () => {
  const valid = {
    BETTER_AUTH_SECRET: 'test-only-secret-for-production-config-validation', NODE_ENV: 'production', FRONTEND_URL: 'https://pomogit.example',
    DATABASE_URL: 'postgresql://app:private-placeholder@db.example/pomogit',
    DATABASE_SSL: 'true', DEV_BYPASS_AUTH: 'false',
    GITHUB_CLIENT_ID: 'placeholder', GITHUB_CLIENT_SECRET: 'private-placeholder',
    GITHUB_CALLBACK_URL: 'https://pomogit.example/api/auth/github/callback',
  };
  assert.doesNotThrow(() => validateProductionConfig(valid));
  assert.doesNotThrow(() => validateProductionConfig({ ...valid, API_URL: 'https://api.pomogit.example', GITHUB_CALLBACK_URL: 'https://api.pomogit.example/api/auth/github/callback' }));
  assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => validateProductionConfig({ ...valid, DATABASE_URL: 'postgresql://app@127.0.0.1/pomogit', DATABASE_SSL: 'false' }));
  assert.doesNotThrow(() => validateProductionConfig({ ...valid, GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', GITHUB_CALLBACK_URL: '' }));
  for (const override of [
    { BETTER_AUTH_SECRET: undefined }, { BETTER_AUTH_SECRET: 'short' }, { FRONTEND_URL: undefined }, { FRONTEND_URL: 'http://pomogit.example' },
    { API_URL: 'http://api.pomogit.example' }, { API_URL: 'https://api.pomogit.example/' }, { API_URL: 'https://user:private-placeholder@api.pomogit.example' }, { API_URL: 'https://api.pomogit.example' },
    { FRONTEND_URL: 'https://pomogit.example/' }, { FRONTEND_URL: 'https://name:private-placeholder@pomogit.example' },
    { DATABASE_URL: 'private-placeholder' }, { DATABASE_URL: 'https://db.example/pomogit' },
    { DATABASE_URL: 'postgresql://db.example' },
    { DATABASE_URL: `${valid.DATABASE_URL}?sslmode=no-verify` },
    { DATABASE_URL: `${valid.DATABASE_URL}?host=127.0.0.1` },
    { DATABASE_SSL: 'false' }, { DATABASE_SSL: 'off' }, { DEV_BYPASS_AUTH: 'true' },
    { GITHUB_CLIENT_SECRET: '' }, { GITHUB_CALLBACK_URL: 'https://elsewhere.example/api/auth/github/callback' },
  ]) {
    assert.throws(() => validateProductionConfig({ ...valid, ...override }), error => {
      assert.match(error.message, /^Production configuration:/);
      assert.ok(!error.message.includes('private-placeholder'));
      return true;
    });
  }
});
