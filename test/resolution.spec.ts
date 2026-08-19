import { describe, expect, it } from 'vitest'
import { clampWindowBounds, desktopWorkArea, logicalPointerDelta, RESOLUTION_PRESETS, resolutionById, resolveDesktopSize, reflowWindows, tileWindowBounds, UI_SIZE_PRESETS, uiMetrics } from '../src/desktop/resolution.ts'
import type { DesktopWindowState } from '../src/desktop/types.ts'

describe('logical resolution geometry', () => {
  it('offers only fixed 1:1 work-area dimensions', () => {
    expect(RESOLUTION_PRESETS.map(({ width, height }) => [width, height])).toEqual([
      [512, 342], [640, 480], [832, 624], [1024, 768],
    ])
  })

  it('fits the browser at either integer magnification and falls back to Standard for unknown fixed presets', () => {
    expect(resolveDesktopSize('adaptive', 1280, 721, 1)).toEqual({ width: 1280, height: 721 })
    expect(resolveDesktopSize('adaptive', 1280, 721, 2)).toEqual({ width: 640, height: 360 })
    expect(resolveDesktopSize('compact', 1280, 721, 2)).toMatchObject({ width: 640, height: 480 })
    expect(resolutionById('not-valid' as 'standard').id).toBe('standard')
  })

  it('defines only the stable 10 and 12px interface metrics', () => {
    expect(UI_SIZE_PRESETS.map(preset => preset.baseFontSize)).toEqual([10, 12])
    expect(uiMetrics(12)).toMatchObject({ menuBarHeight: 22, titleBarHeight: 20, controlHeight: 22 })
    expect(desktopWorkArea(640, 480, 12)).toEqual({ x: 0, y: 22, width: 640, height: 458 })
  })

  it('maps physical pointer movement through integer magnification', () => {
    expect(logicalPointerDelta(40, 1)).toBe(40)
    expect(logicalPointerDelta(40, 2)).toBe(20)
    expect(logicalPointerDelta(-18, 2)).toBe(-9)
  })

  it('keeps title bars and dimensions within the work area', () => {
    const area = desktopWorkArea(640, 480)
    expect(clampWindowBounds({ x: 900, y: 900, width: 900, height: 900 }, area)).toEqual({ x: 0, y: 18, width: 640, height: 462 })
    const tiny = clampWindowBounds({ x: -10, y: -10, width: 20, height: 20 }, area)
    expect(tiny.x).toBe(0)
    expect(tiny.y).toBe(18)
    expect(tiny.width).toBe(140)
    expect(tiny.height).toBe(60)
    expect(clampWindowBounds({ x: 2.4, y: 19.7, width: 220.6, height: 100.2 }, area)).toEqual({ x: 2, y: 20, width: 221, height: 100 })
  })

  it('tiles deterministically without overlaps', () => {
    const area = desktopWorkArea(832, 624)
    const cells = tileWindowBounds(5, area)
    expect(cells).toHaveLength(5)
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(area.x)
      expect(cell.y).toBeGreaterThanOrEqual(area.y)
      expect(cell.x + cell.width).toBeLessThanOrEqual(area.x + area.width)
      expect(cell.y + cell.height).toBeLessThanOrEqual(area.y + area.height)
    }
    for (let left = 0; left < cells.length; left += 1) for (let right = left + 1; right < cells.length; right += 1) {
      const a = cells[left]!
      const b = cells[right]!
      const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
      expect(overlap).toBe(false)
    }
  })

  it('reflows zoomed and normal windows on resolution change', () => {
    const windows: DesktopWindowState[] = [
      { id: 'a', appId: 'finder', title: 'A', bounds: { x: 900, y: 700, width: 300, height: 200 }, zIndex: 1, state: 'normal' },
      { id: 'b', appId: 'preview', title: 'B', bounds: { x: 0, y: 0, width: 10, height: 10 }, zIndex: 2, state: 'zoomed' },
    ]
    const area = desktopWorkArea(640, 480)
    const result = reflowWindows(windows, area)
    expect(result[0]!.bounds.x + result[0]!.bounds.width).toBeLessThanOrEqual(640)
    expect(result[1]!.bounds).toEqual(area)
  })
})
