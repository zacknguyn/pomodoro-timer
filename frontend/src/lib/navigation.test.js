import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveInitialView } from './navigation.js'

test('active work always resumes in Focus', () => {
  assert.equal(resolveInitialView({ requested: 'worklog', hasSession: true, workspaceOpened: true }), 'focus')
})

test('legacy workspace links resolve into the board page model', () => {
  assert.equal(resolveInitialView({ requested: 'today', hasSession: false, workspaceOpened: true }), 'home')
  assert.equal(resolveInitialView({ requested: 'queue', hasSession: false, workspaceOpened: true }), 'board')
  assert.equal(resolveInitialView({ requested: 'plan', hasSession: false, workspaceOpened: true }), 'board')
  assert.equal(resolveInitialView({ requested: 'history', hasSession: false, workspaceOpened: true }), 'worklog')
})

test('current workspace links are preserved', () => {
  assert.equal(resolveInitialView({ requested: 'board', hasSession: false, workspaceOpened: true }), 'board')
  assert.equal(resolveInitialView({ requested: 'canvas', hasSession: false, workspaceOpened: true }), 'canvas')
})

test('returning users enter Home while first-time users see the landing page', () => {
  assert.equal(resolveInitialView({ requested: '', hasSession: false, workspaceOpened: true }), 'home')
  assert.equal(resolveInitialView({ requested: '', hasSession: false, workspaceOpened: false }), 'landing')
})
