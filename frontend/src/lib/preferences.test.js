import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasOpenedWorkspace,
  markWorkspaceOpened,
  PROFILE_KEY,
  readProfile,
  readTheme,
  readWorkProtocol,
  THEME_KEY,
  WORK_PROTOCOL_KEY,
  WORKSPACE_OPENED_KEY,
  writeProfile,
  writeTheme,
  writeWorkProtocol,
} from './preferences.js'

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  }
}

test('workspace remains first-visit-only after opening', () => {
  const storage = memoryStorage()
  assert.equal(hasOpenedWorkspace(storage), false)
  markWorkspaceOpened(storage)
  assert.equal(storage.values.get(WORKSPACE_OPENED_KEY), 'true')
  assert.equal(hasOpenedWorkspace(storage), true)
})

test('theme reads the rebrand key and migrates the previous preference', () => {
  assert.equal(readTheme(memoryStorage({ [THEME_KEY]: 'dark' })), 'dark')
  assert.equal(readTheme(memoryStorage({ 'stillpoint.theme': 'dark' })), 'dark')
  assert.equal(readTheme(memoryStorage(), true), 'dark')
  const storage = memoryStorage()
  writeTheme(storage, 'light')
  assert.equal(storage.values.get(THEME_KEY), 'light')
})

test('profile and work protocol survive malformed and out-of-range preferences', () => {
  const storage = memoryStorage({ [PROFILE_KEY]: '{broken', [WORK_PROTOCOL_KEY]: JSON.stringify({ focusMinutes: 500, weekStart: 'sunday' }) })
  assert.equal(readProfile(storage).displayName, 'Local maker')
  assert.deepEqual(readWorkProtocol(storage), { focusMinutes: 120, checkpointRule: 'always', weekStart: 'sunday' })

  writeProfile(storage, { displayName: 'Phong', headline: 'Makes things move.' })
  writeWorkProtocol(storage, { focusMinutes: 45, weekStart: 'monday' })
  assert.equal(readProfile(storage).displayName, 'Phong')
  assert.equal(readWorkProtocol(storage).focusMinutes, 45)
})
