// Adapted from Dither Kit v0.1.0 chart primitives by ripgrim (MIT).
import { useEffect, useRef } from 'react'
import { BAYER4, fillOf, pixelPrefersReducedMotion } from './pixel'
import { rgb } from './palette'

const CELL = 3
const ENTRANCE_MS = 1700

function useDitherCanvas(wrapperRef, canvasRef, bloomRef, paint, signature) {
  const paintRef = useRef(paint)

  useEffect(() => {
    paintRef.current = paint
  }, [paint])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    const bloomCanvas = bloomRef.current
    if (!wrapper || !canvas || !bloomCanvas) return undefined

    let frame = 0
    let startedAt = 0
    const reduceMotion = pixelPrefersReducedMotion()

    const render = (progress = 1) => {
      const bounds = wrapper.getBoundingClientRect()
      const columns = Math.max(24, Math.round(bounds.width / CELL))
      const rows = Math.max(20, Math.round(bounds.height / CELL))
      if (canvas.width !== columns || canvas.height !== rows) {
        canvas.width = columns
        canvas.height = rows
        bloomCanvas.width = columns
        bloomCanvas.height = rows
      }
      paintRef.current(canvas, columns, rows, progress, window.matchMedia('(max-width: 639px)').matches ? 'hatched' : 'gradient')
      const bloomContext = bloomCanvas.getContext('2d')
      bloomContext?.clearRect(0, 0, columns, rows)
      bloomContext?.drawImage(canvas, 0, 0)
    }

    const animate = (time) => {
      if (!startedAt) startedAt = time
      const elapsed = Math.min(1, (time - startedAt) / ENTRANCE_MS)
      const progress = 1 - ((1 - elapsed) ** 3)
      render(progress)
      if (elapsed < 1) frame = window.requestAnimationFrame(animate)
    }

    if (reduceMotion) render(1)
    else frame = window.requestAnimationFrame(animate)

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => render(1))
    observer?.observe(wrapper)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [bloomRef, canvasRef, signature, wrapperRef])

}

function ChartCanvas({ paint, signature, className = '', label }) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const bloomRef = useRef(null)
  useDitherCanvas(wrapperRef, canvasRef, bloomRef, paint, signature)
  return <div ref={wrapperRef} className={`dither-chart-canvas ${className}`.trim()} role="img" aria-label={label}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <canvas ref={bloomRef} className="dither-chart-bloom" aria-hidden="true" />
  </div>
}

export function DitherAreaChart({ data, label }) {
  const signature = data.map((item) => `${item.label}:${item.value}`).join('|')
  const paint = (canvas, columns, rows, progress, variant) => {
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, columns, rows)
    const padding = { top: 4, right: 3, bottom: 4, left: 3 }
    const width = columns - padding.left - padding.right
    const height = rows - padding.top - padding.bottom
    const values = data.map((item) => item.value)
    const maximum = Math.max(1, ...values)
    const fill = fillOf('blue')
    const visibleRight = padding.left + width * progress

    context.strokeStyle = 'rgba(110,116,128,0.18)'
    context.lineWidth = 0.5
    for (let guide = 0; guide <= 2; guide += 1) {
      const y = Math.round(padding.top + height * (guide / 2)) + 0.5
      context.beginPath()
      context.moveTo(padding.left, y)
      context.lineTo(columns - padding.right, y)
      context.stroke()
    }

    const pointY = (index) => padding.top + height * (1 - values[index] / maximum)
    for (let x = padding.left; x <= Math.floor(visibleRight); x += 1) {
      const ratio = width <= 0 ? 0 : (x - padding.left) / width
      const scaled = ratio * Math.max(1, data.length - 1)
      const first = Math.min(data.length - 1, Math.floor(scaled))
      const second = Math.min(data.length - 1, first + 1)
      const yLine = pointY(first) + (pointY(second) - pointY(first)) * (scaled - first)
      for (let y = Math.ceil(yLine); y < rows - padding.bottom; y += 1) {
        const depth = (y - yLine) / Math.max(1, rows - padding.bottom - yLine)
        const density = 0.78 - depth * 0.6
        const lit = variant === 'hatched'
          ? ((x + y) & 3) < 2
          : density > BAYER4[y & 3][x & 3]
        if (!lit) continue
        context.fillStyle = rgb(fill, 1, 0.42 + density * 0.45)
        context.fillRect(x, y, 1, 1)
      }
    }

    context.strokeStyle = rgb(fill, 1, 0.95)
    context.lineWidth = 1
    context.beginPath()
    data.forEach((item, index) => {
      const x = padding.left + width * (index / Math.max(1, data.length - 1))
      if (x > visibleRight) return
      const y = pointY(index)
      if (index === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    })
    context.stroke()
  }
  return <div className="dither-area-chart">
    <ChartCanvas paint={paint} signature={signature} label={label} />
    <div className="dither-chart-axis" aria-hidden="true">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div>
  </div>
}

export function DitherDonutChart({ data, label }) {
  const signature = data.map((item) => `${item.name}:${item.value}:${item.color}`).join('|')
  const paint = (canvas, columns, rows, progress, variant) => {
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, columns, rows)
    const total = data.reduce((sum, item) => sum + item.value, 0)
    if (!total) return
    const centerX = columns / 2
    const centerY = rows / 2
    const outerRadius = Math.max(4, Math.min(columns, rows) * 0.46)
    const innerRadius = outerRadius * 0.45
    let start = -Math.PI / 2
    const revealEnd = -Math.PI / 2 + Math.PI * 2 * progress

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const distance = Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY)
        if (distance < innerRadius || distance > outerRadius) continue
        let angle = Math.atan2(y + 0.5 - centerY, x + 0.5 - centerX)
        if (angle < -Math.PI / 2) angle += Math.PI * 2
        if (angle > revealEnd) continue
        let segment = data[data.length - 1]
        let cursor = start
        for (const item of data) {
          const end = cursor + Math.PI * 2 * (item.value / total)
          if (angle >= cursor && angle <= end) { segment = item; break }
          cursor = end
        }
        const density = 0.72 + 0.22 * ((distance - innerRadius) / (outerRadius - innerRadius))
        const lit = variant === 'hatched'
          ? ((x + y) & 3) < 2
          : density > BAYER4[y & 3][x & 3]
        if (!lit) continue
        context.fillStyle = rgb(fillOf(segment.color), 1, 0.9)
        context.fillRect(x, y, 1, 1)
      }
    }
  }
  return <ChartCanvas paint={paint} signature={signature} className="is-donut" label={label} />
}
