export const WORKBENCH_STATUSES = [['inbox', 'Inbox'], ['ready', 'Ready'], ['progress', 'In progress'], ['done', 'Done']]

export function readableDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
export function safeReference(value) {
  if (!value) return ''
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}
