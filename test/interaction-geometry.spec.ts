import { describe, expect, it } from 'vitest'
import { clampOverlay, placeBalloon, toLogicalPoint } from '../src/system7/interaction-geometry.ts'

describe('System 7 overlay geometry', () => {
  it('maps browser coordinates back through exact 1x and 2x desktop scale', () => {
    expect(toLogicalPoint(220, 140, 20, 40, 1)).toEqual({ x: 200, y: 100 })
    expect(toLogicalPoint(420, 240, 20, 40, 2)).toEqual({ x: 200, y: 100 })
  })

  it('keeps context menus inside the logical desktop', () => {
    expect(clampOverlay({ x: 620, y: 470 }, { width: 180, height: 120 }, { width: 640, height: 480 })).toEqual({ x: 458, y: 358 })
    expect(clampOverlay({ x: -20, y: -10 }, { width: 120, height: 80 }, { width: 640, height: 480 })).toEqual({ x: 2, y: 2 })
  })

  it('flips a balloon above the pointer near the bottom and clears the menu bar', () => {
    expect(placeBalloon({ x: 610, y: 460 }, { width: 160, height: 80 }, { width: 640, height: 480 }, 22)).toEqual({ x: 477, y: 368 })
    expect(placeBalloon({ x: 10, y: 5 }, { width: 100, height: 40 }, { width: 640, height: 480 }, 22).y).toBe(25)
  })
})
