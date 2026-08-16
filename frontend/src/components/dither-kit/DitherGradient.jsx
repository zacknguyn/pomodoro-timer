// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).
import { useEffect, useRef } from 'react'
import { BAYER4, fillOf, pixelBloomStyle } from './pixel'
import { rgb } from './palette'

function paintGradient(canvas, bloomCanvas, width, height, { from, to, direction, cell, opacity }) {
  const context = canvas.getContext('2d')
  if (!context || width <= 0 || height <= 0) return
  const columns = Math.min(960, Math.max(4, Math.round(width / cell)))
  const rows = Math.min(600, Math.max(4, Math.round(height / cell)))
  canvas.width = columns
  canvas.height = rows
  const fromFill = fillOf(from)
  const toFill = to === 'transparent' ? null : fillOf(to)
  context.clearRect(0, 0, columns, rows)
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const progress = direction === 'up' ? 1 - (y + 0.5) / rows
        : direction === 'down' ? (y + 0.5) / rows
          : direction === 'left' ? 1 - (x + 0.5) / columns
            : (x + 0.5) / columns
      const density = 1 - progress
      const lit = density > BAYER4[y & 3][x & 3]
      if (toFill) context.fillStyle = rgb(lit ? fromFill : toFill, 1, opacity)
      else {
        const alpha = (lit ? 0.35 + 0.65 * density : 0.12 * density) * opacity
        if (alpha <= 0.004) continue
        context.fillStyle = rgb(fromFill, 1, alpha)
      }
      context.fillRect(x, y, 1, 1)
    }
  }
  const bloomContext = bloomCanvas?.getContext('2d')
  if (bloomCanvas && bloomContext) {
    bloomCanvas.width = columns
    bloomCanvas.height = rows
    bloomContext.drawImage(canvas, 0, 0)
  }
}

export function DitherGradient({ from = 84, to = 'transparent', direction = 'right', cell = 3, opacity = 1, bloom = 'off', className = '' }) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const bloomRef = useRef(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return undefined
    const paint = () => {
      const bounds = wrapper.getBoundingClientRect()
      paintGradient(canvas, bloomRef.current, bounds.width, bounds.height, { from, to, direction, cell, opacity })
    }
    paint()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(paint)
    observer?.observe(wrapper)
    return () => observer?.disconnect()
  }, [bloom, cell, direction, from, opacity, to])

  const bloomStyle = pixelBloomStyle(bloom)
  return <div ref={wrapperRef} className={`dither-gradient ${className}`.trim()} aria-hidden="true">
    <canvas ref={canvasRef} className="dither-gradient-canvas" />
    {bloomStyle && <canvas ref={bloomRef} className="dither-gradient-canvas dither-gradient-bloom" style={bloomStyle} />}
  </div>
}
