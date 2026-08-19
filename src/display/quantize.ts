import { MONO_PALETTE, type Rgb } from './palettes.ts'

export interface PixelBuffer {
  width: number
  height: number
  data: Uint8ClampedArray
}

export type PreviewFilterMode = 'monochrome' | 'grayscale'

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const

export function nearestColor(red: number, green: number, blue: number, palette: readonly Rgb[]): Rgb {
  let nearest = palette[0] ?? [0, 0, 0]
  let distance = Number.POSITIVE_INFINITY
  for (const color of palette) {
    const dr = red - color[0]
    const dg = green - color[1]
    const db = blue - color[2]
    const candidate = dr * dr + dg * dg + db * db
    if (candidate < distance) {
      nearest = color
      distance = candidate
    }
  }
  return nearest
}

export function quantizePixels(
  source: PixelBuffer,
  mode: PreviewFilterMode,
): PixelBuffer {
  const output = new Uint8ClampedArray(source.data)
  if (mode === 'grayscale') {
    for (let index = 0; index < output.length; index += 4) {
      const gray = Math.round(output[index]! * 0.2126 + output[index + 1]! * 0.7152 + output[index + 2]! * 0.0722)
      output[index] = gray
      output[index + 1] = gray
      output[index + 2] = gray
    }
    return { width: source.width, height: source.height, data: output }
  }
  const strength = 72
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4
      const threshold = ((BAYER_4[y % 4]![x % 4]! + 0.5) / 16 - 0.5) * strength
      const red = Math.max(0, Math.min(255, output[index]! + threshold))
      const green = Math.max(0, Math.min(255, output[index + 1]! + threshold))
      const blue = Math.max(0, Math.min(255, output[index + 2]! + threshold))
      const color = nearestColor(red, green, blue, MONO_PALETTE)
      output[index] = color[0]
      output[index + 1] = color[1]
      output[index + 2] = color[2]
    }
  }
  return { width: source.width, height: source.height, data: output }
}
