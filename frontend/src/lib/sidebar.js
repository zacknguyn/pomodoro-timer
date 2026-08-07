export const DEFAULT_SIDEBAR_WIDTH = 268
export const MIN_SIDEBAR_WIDTH = 224
export const MAX_SIDEBAR_WIDTH = 360

export function clampSidebarWidth(width) {
  const numericWidth = Number(width)
  if (!Number.isFinite(numericWidth)) return DEFAULT_SIDEBAR_WIDTH
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, numericWidth))
}
