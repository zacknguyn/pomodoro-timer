import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceExportFile } from './workspaceExport.js'

test('JSON export is dated, readable, and preserves all record groups', () => {
  const snapshot = { schemaVersion: 1, tasks: [{ id: 'task-1' }], focusSessions: [], checkpoints: [] }
  const file = createWorkspaceExportFile(snapshot, new Date('2026-08-18T12:00:00.000Z'))
  assert.equal(file.filename, 'pomogit-workspace-2026-08-18.json')
  assert.deepEqual(JSON.parse(file.contents), snapshot)
  assert.equal(file.contents.endsWith('\n'), true)
})
