import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_WORK_PROTOCOL,
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
  assert.deepEqual(readWorkProtocol(storage), { ...DEFAULT_WORK_PROTOCOL, focusMinutes: 120, weekStart: 'sunday' })

  writeProfile(storage, { displayName: 'Phong', headline: 'Makes things move.' })
  writeWorkProtocol(storage, { focusMinutes: 45, weekStart: 'monday' })
  assert.equal(readProfile(storage).displayName, 'Phong')
  assert.equal(readWorkProtocol(storage).focusMinutes, 45)
})

test('workspace appearance validates stored values and keeps the selected layout', () => {
  const storage = memoryStorage({ [WORK_PROTOCOL_KEY]: JSON.stringify({ palette: 'unknown', brightness: 'unknown', navigation: 'unknown', motion: 'unknown' }) })
  assert.equal(readWorkProtocol(storage).palette, 'electric')
  assert.equal(readWorkProtocol(storage).brightness, 'system')
  assert.equal(readWorkProtocol(storage).navigation, 'sidebar')
  writeWorkProtocol(storage, { palette: 'sage', brightness: 'dark', navigation: 'navbar', expand: false })
  assert.equal(readWorkProtocol(storage).navigation, 'navbar')
  assert.equal(readWorkProtocol(storage).brightness, 'dark')
  assert.equal(readWorkProtocol(storage).expand, false)
})


test('return point survives appearance updates and rejects malformed task IDs', () => {
  const storage = memoryStorage()
  writeWorkProtocol(storage, { ...readWorkProtocol(storage), lastTaskId: 'task-42' })
  writeWorkProtocol(storage, { ...readWorkProtocol(storage), brightness: 'dark' })
  assert.equal(readWorkProtocol(storage).lastTaskId, 'task-42')
  storage.setItem(WORK_PROTOCOL_KEY, JSON.stringify({ lastTaskId: { id: 'task-42' } }))
  assert.equal(readWorkProtocol(storage).lastTaskId, null)
})
