import { describe, expect, it } from 'vitest'
import { LruCache } from '../src/display/cache.ts'
import { MONO_PALETTE } from '../src/display/palettes.ts'
import { nearestColor, quantizePixels } from '../src/display/quantize.ts'
import { CAT_TILE_HEIGHT, CAT_TILE_WIDTH, catTilePlacements, pixelRasterPlan, tintMutedTeal } from '../src/display/wallpaper.ts'

describe('authentic display pipeline', () => {
  it('publishes the fixed monochrome Preview palette', () => {
    expect(MONO_PALETTE).toHaveLength(2)
  })

  it('chooses deterministic nearest colors', () => {
    expect(nearestColor(250, 250, 250, MONO_PALETTE)).toEqual([255, 255, 255])
    expect(nearestColor(5, 5, 5, MONO_PALETTE)).toEqual([0, 0, 0])
  })

  it('quantizes without changing source data or alpha', () => {
    const source = { width: 2, height: 1, data: new Uint8ClampedArray([10, 10, 10, 120, 244, 244, 244, 99]) }
    const before = [...source.data]
    const result = quantizePixels(source, 'monochrome')
    expect([...source.data]).toEqual(before)
    expect([...result.data]).toEqual([0, 0, 0, 120, 255, 255, 255, 99])
  })

  it('applies ordered dithering deterministically', () => {
    const source = { width: 4, height: 4, data: new Uint8ClampedArray(4 * 4 * 4).fill(127) }
    for (let index = 3; index < source.data.length; index += 4) source.data[index] = 255
    const first = quantizePixels(source, 'monochrome')
    const second = quantizePixels(source, 'monochrome')
    expect([...first.data]).toEqual([...second.data])
    const values = new Set(Array.from(first.data).filter((_, index) => index % 4 !== 3))
    expect(values).toEqual(new Set([0, 255]))
  })

  it('converts to direct grayscale without changing alpha', () => {
    const source = { width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 77]) }
    const result = quantizePixels(source, 'grayscale')
    expect([...result.data]).toEqual([54, 54, 54, 77])
    expect([...source.data]).toEqual([255, 0, 0, 77])
  })

  it('maps wallpaper tones into the restrained blue-green palette without changing alpha', () => {
    const source = { width: 3, height: 1, data: new Uint8ClampedArray([0, 0, 0, 11, 128, 128, 128, 22, 255, 255, 255, 33]) }
    const tinted = tintMutedTeal(source)
    expect([...tinted.data]).toEqual([48, 79, 76, 11, 123, 146, 143, 22, 198, 213, 209, 33])
    expect([...source.data]).toEqual([0, 0, 0, 11, 128, 128, 128, 22, 255, 255, 255, 33])
  })

  it('builds a low-resolution grid and exact integer-sized output blocks', () => {
    expect(pixelRasterPlan(1254, 1254, 256, 1)).toEqual({ lowWidth: 256, lowHeight: 256, outputWidth: 256, outputHeight: 256 })
    expect(pixelRasterPlan(1254, 1254, 384, 2)).toEqual({ lowWidth: 192, lowHeight: 192, outputWidth: 384, outputHeight: 384 })
    expect(pixelRasterPlan(1600, 900, 512, 2)).toEqual({ lowWidth: 256, lowHeight: 144, outputWidth: 512, outputHeight: 288 })
    const plan = pixelRasterPlan(4032, 3024, 512, 2)
    expect(plan.outputWidth % 2).toBe(0)
    expect(plan.outputHeight % 2).toBe(0)
  })

  it('wraps the staggered cat lattice across both tile seams', () => {
    const placements = catTilePlacements(118)
    expect(placements.some(point => point.x === -CAT_TILE_WIDTH / 4)).toBe(true)
    expect(placements.some(point => point.x === CAT_TILE_WIDTH * 3 / 4)).toBe(true)
    expect(placements.some(point => point.y < 0)).toBe(true)
    expect(placements.some(point => point.y > CAT_TILE_HEIGHT)).toBe(true)
    expect(CAT_TILE_WIDTH * 3 / 4 - (-CAT_TILE_WIDTH / 4)).toBe(CAT_TILE_WIDTH)
  })

  it('evicts the least recently used display result', () => {
    const cache = new LruCache<number>(2)
    cache.set('a', 1); cache.set('b', 2); expect(cache.get('a')).toBe(1); cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
  })
})
