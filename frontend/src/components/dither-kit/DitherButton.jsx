// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).
import { useEffect, useRef } from 'react'
import { BAYER4, clamp01, fillOf, pixelBloomStyle, pixelPrefersReducedMotion } from './pixel'
import { rgb } from './palette'

const CELL = 2

function paintButton(context, bloomContext, columns, rows, fill, variant, intensity) {
  context.clearRect(0, 0, columns, rows)
  const bias = variant === 'dotted' ? 0.12 : 0
  for (let y = 0; y < rows; y += 1) {
    const density = variant === 'gradient' ? 0.25 + 0.75 * ((y + 0.5) / rows) : variant === 'dotted' ? 0.5 : 0.75
    for (let x = 0; x < columns; x += 1) {
      if (variant === 'hatched' && ((x + y) & 3) >= 2) continue
      const lit = variant === 'solid' || density > BAYER4[y & 3][x & 3] - 0.1 * intensity - bias
      if (variant === 'dotted' && !lit) continue
      const strength = (0.3 + density * 0.7) * (1 + 0.22 * intensity)
      context.fillStyle = rgb(fill, 1, clamp01(lit ? strength : strength * 0.4))
      context.fillRect(x, y, 1, 1)
    }
  }
  if (bloomContext) {
    bloomContext.clearRect(0, 0, columns, rows)
    bloomContext.drawImage(context.canvas, 0, 0)
  }
}

export function DitherButton({ color = 'blue', variant = 'gradient', bloom = 'off', className = '', children, ...props }) {
  const buttonRef = useRef(null)
  const canvasRef = useRef(null)
  const bloomRef = useRef(null)

  useEffect(() => {
    const button = buttonRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!button || !canvas || !context) return undefined
    const bloomCanvas = bloomRef.current
    const bloomContext = bloomCanvas?.getContext('2d') ?? null
    const fill = fillOf(color)
    const reduceMotion = pixelPrefersReducedMotion()
    let columns = 0
    let rows = 0
    let intensity = 0
    let target = 0
    let hovered = false
    let frame = 0

    const paint = () => paintButton(context, bloomContext, columns, rows, fill, variant, intensity)
    const tick = () => {
      const distance = target - intensity
      if (Math.abs(distance) < 0.01) { intensity = target; paint(); frame = 0; return }
      intensity += distance * 0.16
      paint()
      frame = window.requestAnimationFrame(tick)
    }
    const setTarget = (nextTarget) => {
      target = nextTarget
      if (reduceMotion) { intensity = target; paint() }
      else if (!frame) frame = window.requestAnimationFrame(tick)
    }
    const resize = () => {
      const bounds = button.getBoundingClientRect()
      columns = Math.max(4, Math.round(bounds.width / CELL))
      rows = Math.max(4, Math.round(bounds.height / CELL))
      canvas.width = columns
      canvas.height = rows
      if (bloomCanvas) { bloomCanvas.width = columns; bloomCanvas.height = rows }
      paint()
    }
    const enter = () => { hovered = true; setTarget(1) }
    const leave = () => { hovered = false; setTarget(0) }
    const down = () => setTarget(1.5)
    const up = () => setTarget(hovered ? 1 : 0)

    resize()
    button.addEventListener('pointerenter', enter)
    button.addEventListener('pointerleave', leave)
    button.addEventListener('pointerdown', down)
    button.addEventListener('pointerup', up)
    button.addEventListener('pointercancel', up)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(button)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      button.removeEventListener('pointerenter', enter)
      button.removeEventListener('pointerleave', leave)
      button.removeEventListener('pointerdown', down)
      button.removeEventListener('pointerup', up)
      button.removeEventListener('pointercancel', up)
      observer?.disconnect()
    }
  }, [bloom, color, variant])

  const bloomStyle = pixelBloomStyle(bloom)
  return <button ref={buttonRef} type="button" className={`dither-button ${className}`.trim()} {...props}>
    <canvas ref={canvasRef} className="dither-button-canvas" aria-hidden="true" />
    {bloomStyle && <canvas ref={bloomRef} className="dither-button-canvas dither-button-bloom" style={bloomStyle} aria-hidden="true" />}
    <span className="dither-button-content">{children}</span>
  </button>
}
