import test from 'node:test'
import assert from 'node:assert/strict'
import { captureTask } from './workbenchView.js'

test('capture gives repository links readable titles without implying an import', () => {
  const referenceUrl = 'https://github.com/zacknguyn/country-search-api'
  assert.deepEqual(captureTask(referenceUrl, 'Selected project'), { title: 'zacknguyn/country-search-api', referenceUrl, project: 'Selected project' })
  assert.equal(captureTask('github.com/zacknguyn/country-search-api.git').title, 'zacknguyn/country-search-api')
  assert.equal(captureTask(`${referenceUrl}/issues/12?tab=comments#issue`).title, 'zacknguyn/country-search-api #12')
  assert.equal(captureTask('https://example.com/').title, 'example.com')
  assert.equal(captureTask('https://github.com.evil.invalid/owner/repo').title, 'github.com.evil.invalid/owner/repo')
  assert.equal(captureTask('  Fix callback retry  ').title, 'Fix callback retry')
  assert.equal(captureTask('javascript:alert(1)').referenceUrl, '')
})
