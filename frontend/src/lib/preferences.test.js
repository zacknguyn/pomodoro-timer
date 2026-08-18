import test from 'node:test'
import assert from 'node:assert/strict'
import { hasOpenedWorkspace, markWorkspaceOpened, readTheme, THEME_KEY, WORKSPACE_OPENED_KEY, writeTheme } from './preferences.js'

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
