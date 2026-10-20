// Foreground events share a read. A completed mutation must get a newer read.
export function coalesceRefresh(load) {
  let pending = null
  return function refresh({ afterMutation = false } = {}) {
    if (pending) {
      return afterMutation ? pending.catch(() => {}).then(() => refresh()) : pending
    }
    pending = Promise.resolve().then(load).finally(() => { pending = null })
    return pending
  }
}
