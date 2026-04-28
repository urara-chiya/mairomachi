function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) =>
        Math.round(Math.max(0, Math.min(255, x)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

export function darken(hex: string, factor = 0.6): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * factor, g * factor, b * factor)
}

export function lighten(hex: string, factor = 1.4): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(Math.min(255, r * factor), Math.min(255, g * factor), Math.min(255, b * factor))
}
