// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).
import { useEffect, useRef } from 'react'
import { rgb } from './palette'
import {
  BAYER4,
  clamp01,
  fnv1a,
  hueFill,
  pixelBloomStyle,
  pixelPrefersReducedMotion,
  xorshift32,
} from './pixel'

const GRID = 8
const CELL_PX = 4

function avatarModel(name, hueOverride, mirror) {
  const random = xorshift32(fnv1a(name))
  const bits = Array.from({ length: 32 }, () => random() < 0.5)
  const generatedVertical = random() < 0.5
  const generatedHue = Math.floor(random() * 180) * 2
  const halfDensity = Array.from({ length: 32 }, () => 0.55 + random() * 0.45)
  const vertical = mirror === 'auto' ? generatedVertical : mirror === 'vertical'
  const on = new Array(GRID * GRID)
  const density = new Array(GRID * GRID)

  for (let row = 0; row < GRID; row += 1) {
    for (let column = 0; column < GRID; column += 1) {
      const source = vertical
        ? Math.min(row, GRID - 1 - row) * GRID + column
        : row * (GRID / 2) + Math.min(column, GRID - 1 - column)
      on[row * GRID + column] = bits[source]
      density[row * GRID + column] = halfDensity[source]
    }
  }

  return { on, density, fill: hueFill(hueOverride ?? generatedHue) }
}

function paintAvatar(canvas, bloomCanvas, model, animate, duration) {
  const context = canvas.getContext('2d')
  if (!context) return undefined
  const pixels = GRID * CELL_PX
  canvas.width = pixels
  canvas.height = pixels
  const bloomContext = bloomCanvas?.getContext('2d') ?? null
  if (bloomCanvas) {
    bloomCanvas.width = pixels
    bloomCanvas.height = pixels
  }

  const draw = (progress) => {
    context.clearRect(0, 0, pixels, pixels)
    for (let row = 0; row < GRID; row += 1) {
      for (let column = 0; column < GRID; column += 1) {
        const cell = row * GRID + column
        if (!model.on[cell]) continue
        const start = BAYER4[row % 4][column % 4] * 0.7
        const cellAlpha = clamp01((progress - start) / 0.3)
        if (cellAlpha <= 0) continue
        const density = model.density[cell]
        const base = 0.35 + 0.65 * density
        for (let pixelY = 0; pixelY < CELL_PX; pixelY += 1) {
          for (let pixelX = 0; pixelX < CELL_PX; pixelX += 1) {
            const x = column * CELL_PX + pixelX
            const y = row * CELL_PX + pixelY
            const lit = density > BAYER4[y & 3][x & 3]
            context.fillStyle = rgb(model.fill, 1, (lit ? base : base * 0.35) * cellAlpha)
            context.fillRect(x, y, 1, 1)
          }
        }
      }
    }
    if (bloomContext) {
      bloomContext.clearRect(0, 0, pixels, pixels)
      bloomContext.drawImage(canvas, 0, 0)
    }
  }

  if (!animate || pixelPrefersReducedMotion()) {
    draw(1)
    return undefined
  }

  let frame = 0
  const startedAt = performance.now()
  const tick = (now) => {
    const progress = clamp01((now - startedAt) / duration)
    draw(1 - (1 - progress) ** 3)
    if (progress < 1) frame = window.requestAnimationFrame(tick)
  }
  frame = window.requestAnimationFrame(tick)
  return () => window.cancelAnimationFrame(frame)
}

export function DitherAvatar({ name, hue, mirror = 'auto', size, bloom = 'off', animate = true, animationDuration = 600, replayToken = 0, className = '' }) {
  const canvasRef = useRef(null)
  const bloomRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    return paintAvatar(canvas, bloomRef.current, avatarModel(name, hue, mirror), animate, animationDuration)
  }, [name, hue, mirror, animate, animationDuration, replayToken, bloom])

  const bloomStyle = pixelBloomStyle(bloom)
  return (
    <div role="img" aria-label={`${name} avatar`} className={`dither-avatar ${className}`.trim()} style={size == null ? undefined : { width: size, height: size }}>
      <canvas ref={canvasRef} aria-hidden="true" />
      {bloomStyle && <canvas ref={bloomRef} className="dither-avatar-bloom" style={bloomStyle} aria-hidden="true" />}
    </div>
  )
}
