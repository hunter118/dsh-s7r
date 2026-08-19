import type { Bounds } from './types.ts'
import type { DesktopShortcut } from '../storage/desktop.ts'

export interface SelectionRect { x: number; y: number; width: number; height: number }

export function normalizedSelectionRect(startX: number, startY: number, endX: number, endY: number): SelectionRect {
  return { x: Math.min(startX, endX), y: Math.min(startY, endY), width: Math.abs(endX - startX), height: Math.abs(endY - startY) }
}

export function shortcutsInRect(shortcuts: readonly DesktopShortcut[], rect: SelectionRect, itemWidth: number, itemHeight: number): string[] {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  return shortcuts.filter(item => item.x < right && item.x + itemWidth > rect.x && item.y < bottom && item.y + itemHeight > rect.y).map(item => item.id)
}

export function moveShortcutGroup(shortcuts: readonly DesktopShortcut[], sourceId: string, selectedIds: readonly string[], targetX: number, targetY: number, workArea: Bounds): DesktopShortcut[] {
  const source = shortcuts.find(item => item.id === sourceId)
  if (source === undefined) return [...shortcuts]
  const moving = new Set(selectedIds.includes(sourceId) ? selectedIds : [sourceId])
  const deltaX = targetX - source.x
  const deltaY = targetY - source.y
  return shortcuts.map(item => moving.has(item.id) ? {
    ...item,
    x: Math.max(workArea.x, Math.min(workArea.x + workArea.width - 1, item.x + deltaX)),
    y: Math.max(workArea.y, Math.min(workArea.y + workArea.height - 1, item.y + deltaY)),
  } : item)
}
