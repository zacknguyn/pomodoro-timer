import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveInitialView } from './navigation.js'

test('first-time users see Landing even when a workspace hash was requested', () => {
  assert.equal(resolveInitialView({ requested: 'settings', workspaceOpened: false }), 'landing')
})

test('returning users enter Work and can deep-link only to current workspace views', () => {
  assert.equal(resolveInitialView({ requested: '', workspaceOpened: true }), 'work')
  assert.equal(resolveInitialView({ requested: 'review', workspaceOpened: true }), 'review')
  assert.equal(resolveInitialView({ requested: 'profile', workspaceOpened: true }), 'profile')
  assert.equal(resolveInitialView({ requested: 'tasks', workspaceOpened: true }), 'tasks')
  assert.equal(resolveInitialView({ requested: 'board', workspaceOpened: true }), 'work')
})
