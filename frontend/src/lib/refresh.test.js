import test from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers'
import { coalesceRefresh } from './refresh.js'

test('overlapping foreground events share one read; mutations wait for a fresh read', async () => {
  const reads = []
  const refresh = coalesceRefresh(() => new Promise((resolve, reject) => reads.push({ resolve, reject })))
  const initial = refresh()
  assert.equal(refresh(), initial)
  await Promise.resolve()
  assert.equal(reads.length, 1)
  const afterMutation = refresh({ afterMutation: true })
  const afterSecondMutation = refresh({ afterMutation: true })
  reads[0].resolve('before mutation')
  assert.equal(await initial, 'before mutation')
  await new Promise(setImmediate)
  assert.equal(reads.length, 2)
  reads[1].resolve('after mutation')
  assert.deepEqual(await Promise.all([afterMutation, afterSecondMutation]), ['after mutation', 'after mutation'])

  const failed = refresh()
  const failedCheck = assert.rejects(failed, /offline/)
  await Promise.resolve()
  const recovery = refresh({ afterMutation: true })
  reads[2].reject(new Error('offline'))
  await failedCheck
  await new Promise(setImmediate)
  assert.equal(reads.length, 4)
  reads[3].resolve('recovered')
  assert.equal(await recovery, 'recovered')
})
