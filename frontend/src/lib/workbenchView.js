export const WORKBENCH_STATUSES = [['inbox', 'Inbox'], ['ready', 'Ready'], ['progress', 'In progress'], ['done', 'Done']]

export function readableDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
export function safeReference(value) {
  if (!value) return ''
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}

export function captureTask(value, project = '') {
  const input = value.trim()
  const candidate = /^github\.com\//i.test(input) ? `https://${input}` : input
  const referenceUrl = safeReference(candidate)
  if (!referenceUrl) return { title: input, referenceUrl: '', project }
  const url = new URL(referenceUrl)
  const parts = url.pathname.split('/').filter(Boolean)
  const github = url.hostname.toLowerCase() === 'github.com' && parts.length >= 2
  const title = github
    ? `${parts[0]}/${parts[1].replace(/\.git$/, '')}${['issues', 'pull'].includes(parts[2]) && /^\d+$/.test(parts[3] || '') ? ` #${parts[3]}` : ''}`
    : `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
  return { title, referenceUrl, project }
}
