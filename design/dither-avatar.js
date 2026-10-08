// Standalone preview adapter for the existing Dither Kit avatar (ripgrim, MIT).
// The application component is unchanged. Same model and animated canvas painter; honors reduced motion.
(()=>{
// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).
function rgb([red, green, blue], intensity = 1, alpha = 1) {
  return `rgba(${Math.round(red * intensity)},${Math.round(green * intensity)},${Math.round(blue * intensity)},${alpha})`
}

// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).


const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16))

const clamp01 = (value) => Math.max(0, Math.min(1, value))

function hueFill(hue) {
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

function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function xorshift32(seed) {
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

function pixelPrefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

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


const activeAnimations=new WeakMap();
window.paintDitherAvatar=(canvas,name,animate=true)=>{
 activeAnimations.get(canvas)?.();
 const cancel=paintAvatar(canvas,null,avatarModel(name,undefined,'auto'),animate,700);
 if(cancel)activeAnimations.set(canvas,cancel);
};
})();
