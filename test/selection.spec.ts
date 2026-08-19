import { describe, expect, it } from 'vitest'
import { moveShortcutGroup, normalizedSelectionRect, shortcutsInRect } from '../src/desktop/selection.ts'
import type { DesktopShortcut } from '../src/storage/desktop.ts'

const shortcuts: DesktopShortcut[] = [
  { id: 'agent:one', kind: 'agent', label: 'One', sessionId: 'one', x: 10, y: 30 },
  { id: 'agent:two', kind: 'agent', label: 'Two', sessionId: 'two', x: 80, y: 40 },
  { id: 'agent:three', kind: 'agent', label: 'Three', sessionId: 'three', x: 220, y: 140 },
]

describe('desktop multi-selection geometry', () => {
  it('normalizes reverse marquee drags and selects intersecting icons', () => {
    const rect = normalizedSelectionRect(170, 120, 4, 20)
    expect(rect).toEqual({ x: 4, y: 20, width: 166, height: 100 })
    expect(shortcutsInRect(shortcuts, rect, 70, 52)).toEqual(['agent:one', 'agent:two'])
  })

  it('moves the selected group by the dragged icon delta', () => {
    const moved = moveShortcutGroup(shortcuts, 'agent:one', ['agent:one', 'agent:two'], 30, 50, { x: 4, y: 20, width: 300, height: 180 })
    expect(moved.map(item => [item.id, item.x, item.y])).toEqual([
      ['agent:one', 30, 50],
      ['agent:two', 100, 60],
      ['agent:three', 220, 140],
    ])
  })

  it('moves only the dragged icon when it is outside the selection', () => {
    const moved = moveShortcutGroup(shortcuts, 'agent:three', ['agent:one', 'agent:two'], 250, 160, { x: 4, y: 20, width: 300, height: 180 })
    expect(moved[0]).toEqual(shortcuts[0])
    expect(moved[1]).toEqual(shortcuts[1])
    expect(moved[2]).toMatchObject({ x: 250, y: 160 })
  })
})
