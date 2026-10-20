import test from 'node:test'
import assert from 'node:assert/strict'
import { authApi, AuthApiError } from './authApi.js'
import { workApi, WorkApiError } from './workApi.js'

// Check the public clients, not the transport's implementation details.
test('HTTP clients preserve credentials, errors, timeouts and session-expiry policy', async () => {
  const original = { fetch: globalThis.fetch, window: globalThis.window, CustomEvent: globalThis.CustomEvent }
  const events = [], timers = new Map()
  let nextTimer = 0
  globalThis.window = {
    setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id },
    clearTimeout: id => timers.delete(id),
    dispatchEvent: event => { events.push(event.type) },
  }
  globalThis.CustomEvent = class { constructor(type) { this.type = type } }
  try {
    let request
    globalThis.fetch = async (url, options) => { request = { url, options }; return Response.json({ user: { id: 'fixture' } }) }
    assert.deepEqual(await authApi.login({ email: 'fixture@test.invalid', password: 'test-only' }), { user: { id: 'fixture' } })
    assert.equal(request.url, '/api/auth/login')
    assert.equal(request.options.credentials, 'include')
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers['Content-Type'], 'application/json')
    assert.equal(JSON.parse(request.options.body).email, 'fixture@test.invalid')
    assert.equal(timers.size, 0)

    globalThis.fetch = async () => new Response(null, { status: 204 })
    assert.equal(await workApi.deleteTask('fixture'), null)

    globalThis.fetch = async () => Response.json({ error: 'Not signed in' }, { status: 401 })
    await assert.rejects(authApi.me(), error => error instanceof AuthApiError && error.status === 401 && error.message === 'Not signed in')
    assert.deepEqual(events, [])
    await assert.rejects(workApi.listTasks(), error => error instanceof WorkApiError && error.status === 401 && error.message === 'Not signed in')
    assert.deepEqual(events, ['pomogit:auth-expired'])

    globalThis.fetch = async () => new Response('not JSON', { status: 503 })
    await assert.rejects(authApi.me(), { message: 'The request could not be completed.', status: 503 })
    await assert.rejects(workApi.listTasks(), { message: 'The workspace could not be updated.', status: 503 })

    globalThis.fetch = async () => { throw new TypeError('offline') }
    await assert.rejects(authApi.me(), { message: 'Pomogit could not reach the account service.', status: 0 })
    await assert.rejects(workApi.listTasks(), { message: 'The workspace could not connect to the local API.', status: 0 })

    globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))))
    for (const [call, message] of [[() => authApi.me(), 'The account service took too long to respond. Try again.'], [() => workApi.listTasks(), 'The workspace took too long to respond. Try again.']]) {
      const pending = call()
      const rejected = assert.rejects(pending, { message, status: 0 })
      timers.get(nextTimer)()
      await rejected
      assert.equal(timers.size, 0)
    }
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key]
      else globalThis[key] = value
    }
  }
})
