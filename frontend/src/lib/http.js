const API_BASE = import.meta.env?.VITE_API_URL || '/api'

// Clients keep their own messages/error types and authentication side effects.
export async function requestJson(path, options = {}, makeError) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      signal: options.signal || controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (error) {
    throw makeError(error.name === 'AbortError' ? 'timeout' : 'network')
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw makeError('response', response.status, payload?.error)
  }
  return response.status === 204 ? null : response.json()
}
