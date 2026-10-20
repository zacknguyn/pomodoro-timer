import assert from 'node:assert/strict'
import test from 'node:test'
import { GITHUB_LANDING_KEY, githubLandingView, resolveInitialView } from './navigation.js'

test('first-time users see Landing even when a workspace hash was requested', () => {
  assert.equal(resolveInitialView({ requested: 'settings', workspaceOpened: false }), 'landing')
})

test('returning users enter Home and can deep-link only to current workspace views', () => {
  assert.equal(resolveInitialView({ requested: '', workspaceOpened: true }), 'home')
  assert.equal(resolveInitialView({ requested: 'home', workspaceOpened: true }), 'home')
  assert.equal(resolveInitialView({ requested: 'work', workspaceOpened: true }), 'work')
  assert.equal(resolveInitialView({ requested: 'review', workspaceOpened: true }), 'review')
  assert.equal(resolveInitialView({ requested: 'profile', workspaceOpened: true }), 'profile')
  assert.equal(resolveInitialView({ requested: 'tasks', workspaceOpened: true }), 'tasks')
  assert.equal(resolveInitialView({ requested: 'board', workspaceOpened: true }), 'home')
})

test('GitHub landing hint affects only its legacy callback route', () => {
  const hint = { getItem: key => key === GITHUB_LANDING_KEY ? 'home' : null }
  assert.equal(githubLandingView('work', hint), 'home')
  assert.equal(githubLandingView('tasks', hint), 'tasks')
  assert.equal(githubLandingView('login', hint), 'login')
  assert.equal(githubLandingView('work', { getItem: () => null }), 'work')
  assert.equal(githubLandingView('work', { getItem: () => { throw new Error('storage unavailable') } }), 'work')
})
