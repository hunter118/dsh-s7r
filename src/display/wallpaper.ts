import { quantizePixels } from './quantize.ts'
import type { ImportedWallpaper, WallpaperFilterMode, WallpaperPixelSize } from '../storage/wallpaper.ts'

const MAX_WALLPAPER_EDGE = 512
export const CAT_TILE_WIDTH = 384
export const CAT_TILE_HEIGHT = 192
export const CAT_MOTIF_WIDTH = 176

export interface PixelRasterPlan {
  lowWidth: number
  lowHeight: number
  outputWidth: number
  outputHeight: number
}

export interface WallpaperPixelBuffer {
  width: number
  height: number
  data: Uint8ClampedArray
}

const MUTED_TEAL_SHADOW = [48, 79, 76] as const
const MUTED_TEAL_HIGHLIGHT = [198, 213, 209] as const

export function tintMutedTeal(source: WallpaperPixelBuffer): WallpaperPixelBuffer {
  const data = new Uint8ClampedArray(source.data)
  for (let index = 0; index < data.length; index += 4) {
    const tone = Math.round(data[index]! * 0.2126 + data[index + 1]! * 0.7152 + data[index + 2]! * 0.0722) / 255
    data[index] = Math.round(MUTED_TEAL_SHADOW[0] + (MUTED_TEAL_HIGHLIGHT[0] - MUTED_TEAL_SHADOW[0]) * tone)
    data[index + 1] = Math.round(MUTED_TEAL_SHADOW[1] + (MUTED_TEAL_HIGHLIGHT[1] - MUTED_TEAL_SHADOW[1]) * tone)
    data[index + 2] = Math.round(MUTED_TEAL_SHADOW[2] + (MUTED_TEAL_HIGHLIGHT[2] - MUTED_TEAL_SHADOW[2]) * tone)
  }
  return { width: source.width, height: source.height, data }
}

export function pixelRasterPlan(sourceWidth: number, sourceHeight: number, maxEdge: number, pixelSize: WallpaperPixelSize): PixelRasterPlan {
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale))
  const lowWidth = Math.max(1, Math.round(targetWidth / pixelSize))
  const lowHeight = Math.max(1, Math.round(targetHeight / pixelSize))
  return { lowWidth, lowHeight, outputWidth: lowWidth * pixelSize, outputHeight: lowHeight * pixelSize }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { resolve(image) }
    image.onerror = () => { reject(new Error('The selected image could not be decoded.')) }
    image.src = source
  })
}

export function catTilePlacements(motifHeight: number): Array<{ x: number; y: number }> {
  const rowHeight = CAT_TILE_HEIGHT / 2
  const firstY = Math.round((rowHeight - motifHeight) / 2)
  const secondY = firstY + rowHeight
  const fundamental = [
    { x: 0, y: firstY }, { x: CAT_TILE_WIDTH / 2, y: firstY },
    { x: -CAT_TILE_WIDTH / 4, y: secondY }, { x: CAT_TILE_WIDTH / 4, y: secondY }, { x: CAT_TILE_WIDTH * 3 / 4, y: secondY },
  ]
  return fundamental.flatMap(placement => [-CAT_TILE_HEIGHT, 0, CAT_TILE_HEIGHT].map(offset => ({ x: placement.x, y: placement.y + offset })))
}

function normalizeSprite(image: HTMLImageElement): { canvas: HTMLCanvasElement; bounds: { x: number; y: number; width: number; height: number } } {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) throw new Error('This browser cannot prepare the cat wallpaper.')
  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  let left = canvas.width; let top = canvas.height; let right = -1; let bottom = -1
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alphaIndex = (y * canvas.width + x) * 4 + 3
      if (pixels[alphaIndex]! < 128) { pixels[alphaIndex] = 0; continue }
      pixels[alphaIndex] = 255
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y)
    }
  }
  if (right < left || bottom < top) throw new Error('The cat sprite has no visible pixels.')
  context.putImageData(imageData, 0, 0)
  return { canvas, bounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } }
}

export async function buildSeamlessCatTile(spriteSource: string): Promise<string> {
  const image = await loadImage(spriteSource)
  const normalized = normalizeSprite(image)
  const source = normalized.bounds
  const motifHeight = Math.max(1, Math.round(source.height / source.width * CAT_MOTIF_WIDTH))
  const canvas = document.createElement('canvas')
  canvas.width = CAT_TILE_WIDTH
  canvas.height = CAT_TILE_HEIGHT
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('This browser cannot prepare the cat wallpaper.')
  context.fillStyle = '#c8c8c8'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = false
  for (const placement of catTilePlacements(motifHeight)) {
    context.drawImage(normalized.canvas, source.x, source.y, source.width, source.height, placement.x, placement.y, CAT_MOTIF_WIDTH, motifHeight)
  }
  return canvas.toDataURL('image/png')
}

export async function filterWallpaperSource(source: string, mode: WallpaperFilterMode, maxEdge = MAX_WALLPAPER_EDGE, pixelSize: WallpaperPixelSize = 1, tint?: 'muted-teal'): Promise<{ dataUrl: string; width: number; height: number; pixelSize: WallpaperPixelSize }> {
  const image = await loadImage(source)
  const plan = pixelRasterPlan(image.naturalWidth, image.naturalHeight, maxEdge, pixelSize)
  const lowCanvas = document.createElement('canvas')
  lowCanvas.width = plan.lowWidth
  lowCanvas.height = plan.lowHeight
  const lowContext = lowCanvas.getContext('2d', { willReadFrequently: true })
  if (lowContext === null) throw new Error('This browser cannot prepare wallpaper images.')
  lowContext.imageSmoothingEnabled = true
  lowContext.imageSmoothingQuality = 'high'
  lowContext.drawImage(image, 0, 0, plan.lowWidth, plan.lowHeight)
  const quantized = quantizePixels(lowContext.getImageData(0, 0, plan.lowWidth, plan.lowHeight), mode)
  const filtered = tint === 'muted-teal' ? tintMutedTeal(quantized) : quantized
  const imageData = lowContext.createImageData(plan.lowWidth, plan.lowHeight)
  imageData.data.set(filtered.data)
  lowContext.putImageData(imageData, 0, 0)

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = plan.outputWidth
  outputCanvas.height = plan.outputHeight
  const outputContext = outputCanvas.getContext('2d')
  if (outputContext === null) throw new Error('This browser cannot prepare wallpaper images.')
  outputContext.imageSmoothingEnabled = false
  outputContext.drawImage(lowCanvas, 0, 0, plan.outputWidth, plan.outputHeight)
  return { dataUrl: outputCanvas.toDataURL('image/png'), width: plan.outputWidth, height: plan.outputHeight, pixelSize }
}

export async function importWallpaperFile(file: File, mode: WallpaperFilterMode, pixelSize: WallpaperPixelSize): Promise<ImportedWallpaper> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPEG, GIF, or WebP image.')
  if (file.size > 20 * 1024 * 1024) throw new Error('Wallpaper images must be 20 MB or smaller.')
  const objectUrl = URL.createObjectURL(file)
  try {
    const filtered = await filterWallpaperSource(objectUrl, mode, MAX_WALLPAPER_EDGE, pixelSize)
    const importedAt = Date.now()
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `wallpaper-${importedAt}-${Math.random().toString(16).slice(2)}`
    return { version: 4, id, name: file.name, ...filtered, filterMode: mode, importedAt }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
