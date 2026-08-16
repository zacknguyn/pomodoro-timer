// Adapted from Dither Kit v0.1.0 by ripgrim (MIT).
export const PALETTE = {
  green: { fill: [40, 210, 110] },
  blue: { fill: [53, 143, 243] },
  purple: { fill: [150, 110, 255] },
  pink: { fill: [240, 90, 190] },
  orange: { fill: [255, 150, 50] },
  red: { fill: [240, 70, 70] },
  grey: { fill: [92, 92, 100] },
}

export function rgb([red, green, blue], intensity = 1, alpha = 1) {
  return `rgba(${Math.round(red * intensity)},${Math.round(green * intensity)},${Math.round(blue * intensity)},${alpha})`
}
