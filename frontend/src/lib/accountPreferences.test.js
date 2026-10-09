import test from 'node:test'
import assert from 'node:assert/strict'
import { readProfile, writeProfile, readWorkProtocol, writeWorkProtocol } from './preferences.js'

test('account-local profile and settings never inherit another account or preview', () => {
  const data = new Map()
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) }
  writeProfile(storage, { displayName: 'Preview' })
  writeProfile(storage, { displayName: 'Alice' }, 'owner-a')
  writeWorkProtocol(storage, { lastTaskId: 'private-task' }, 'owner-a')
  assert.equal(readProfile(storage, 'owner-a').displayName, 'Alice')
  assert.equal(readProfile(storage, 'owner-b', 'Bob').displayName, 'Bob')
  assert.equal(readWorkProtocol(storage, 'owner-b').lastTaskId, null)
  assert.equal(readWorkProtocol(storage, 'owner-a').lastTaskId, 'private-task')
})
