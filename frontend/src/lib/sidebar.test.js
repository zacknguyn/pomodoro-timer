import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  clampSidebarWidth,
} from './sidebar.js'

test('clampSidebarWidth keeps the rail within its usable range', () => {
  assert.equal(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 80), MIN_SIDEBAR_WIDTH)
  assert.equal(clampSidebarWidth(300), 300)
  assert.equal(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 80), MAX_SIDEBAR_WIDTH)
  assert.equal(clampSidebarWidth('not-a-number'), DEFAULT_SIDEBAR_WIDTH)
})
