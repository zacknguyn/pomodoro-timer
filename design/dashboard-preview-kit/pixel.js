// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).
import { PALETTE } from './palette'

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16))

export const clamp01 = (value) => Math.max(0, Math.min(1, value))

export function hueFill(hue) {
  const normalizedHue = ((hue % 360) + 360) % 360
  const saturation = 0.85
  const lightness = 0.58
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const secondary = chroma * (1 - Math.abs(((normalizedHue / 60) % 2) - 1))
  const match = lightness - chroma / 2
  const [red, green, blue] = normalizedHue < 60 ? [chroma, secondary, 0]
    : normalizedHue < 120 ? [secondary, chroma, 0]
      : normalizedHue < 180 ? [0, chroma, secondary]
        : normalizedHue < 240 ? [0, secondary, chroma]
          : normalizedHue < 300 ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  return [red, green, blue].map((channel) => Math.round((channel + match) * 255))
}

export function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function xorshift32(seed) {
  let state = seed || 0x9e3779b9
  return () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0x100000000
  }
}

export function fillOf(color) {
  return typeof color === 'number' ? hueFill(color) : PALETTE[color].fill
}

const BLOOM_PRESETS = {
  low: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  high: { blur: 25, brightness: 2.9, opacity: 0.2, saturate: 3 },
  aura: { blur: 15, brightness: 2.9, opacity: 0.1, saturate: 3 },
}

export function pixelBloomStyle(bloom) {
  if (bloom === 'off') return null
  const preset = BLOOM_PRESETS[bloom]
  return {
    filter: `blur(${preset.blur}px) brightness(${preset.brightness}) saturate(${preset.saturate})`,
    opacity: preset.opacity,
    mixBlendMode: 'plus-lighter',
    imageRendering: 'auto',
  }
}

export function pixelPrefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}
