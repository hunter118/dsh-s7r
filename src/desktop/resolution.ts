import type { Bounds, DesktopWindowState } from './types.ts'

export type ResolutionPresetId = 'adaptive' | 'classic' | 'compact' | 'standard' | 'expanded'
export type BaseFontSize = 10 | 12
export type PixelScale = 1 | 2

export interface ResolutionPreset {
  id: ResolutionPresetId
  label: string
  width: number
  height: number
}

export const RESOLUTION_PRESETS: readonly ResolutionPreset[] = [
  { id: 'classic', label: 'Classic Macintosh', width: 512, height: 342 },
  { id: 'compact', label: 'Compact', width: 640, height: 480 },
  { id: 'standard', label: 'Standard', width: 832, height: 624 },
  { id: 'expanded', label: 'Expanded', width: 1024, height: 768 },
]

export interface UiMetrics {
  baseFontSize: BaseFontSize
  label: string
  lineHeight: number
  menuBarHeight: number
  titleBarHeight: number
  controlHeight: number
  minWindowWidth: number
  minWindowHeight: number
}

export const UI_SIZE_PRESETS: readonly UiMetrics[] = [
  { baseFontSize: 10, label: 'Compact', lineHeight: 12, menuBarHeight: 18, titleBarHeight: 16, controlHeight: 18, minWindowWidth: 140, minWindowHeight: 60 },
  { baseFontSize: 12, label: 'Comfortable', lineHeight: 15, menuBarHeight: 22, titleBarHeight: 20, controlHeight: 22, minWindowWidth: 168, minWindowHeight: 72 },
]

export function uiMetrics(baseFontSize: BaseFontSize): UiMetrics {
  return UI_SIZE_PRESETS.find(preset => preset.baseFontSize === baseFontSize) ?? UI_SIZE_PRESETS[1]!
}

export function logicalPointerDelta(clientDelta: number, pixelScale: PixelScale): number {
  return Math.round(clientDelta / pixelScale)
}

export function resolutionById(id: ResolutionPresetId): ResolutionPreset {
  return RESOLUTION_PRESETS.find(preset => preset.id === id) ?? RESOLUTION_PRESETS.find(preset => preset.id === 'standard')!
}

export function resolveDesktopSize(id: ResolutionPresetId, viewportWidth: number, viewportHeight: number, pixelScale: PixelScale): { width: number; height: number } {
  if (id !== 'adaptive') return resolutionById(id)
  return {
    width: Math.max(340, Math.floor(viewportWidth / pixelScale)),
    height: Math.max(260, Math.floor(viewportHeight / pixelScale)),
  }
}

export function desktopWorkArea(width: number, height: number, baseFontSize: BaseFontSize = 10): Bounds {
  const menuBarHeight = uiMetrics(baseFontSize).menuBarHeight
  return { x: 0, y: menuBarHeight, width, height: Math.max(0, height - menuBarHeight) }
}

export function clampWindowBounds(bounds: Bounds, workArea: Bounds): Bounds {
  const metrics = UI_SIZE_PRESETS.find(preset => preset.menuBarHeight === workArea.y) ?? UI_SIZE_PRESETS[0]!
  const minWidth = Math.min(metrics.minWindowWidth, workArea.width)
  const minHeight = Math.min(metrics.minWindowHeight, workArea.height)
  const width = Math.round(Math.max(minWidth, Math.min(bounds.width, workArea.width)))
  const height = Math.round(Math.max(minHeight, Math.min(bounds.height, workArea.height)))
  const maxX = workArea.x + Math.max(0, workArea.width - width)
  const maxY = workArea.y + Math.max(0, workArea.height - height)
  return {
    x: Math.round(Math.max(workArea.x, Math.min(bounds.x, maxX))),
    y: Math.round(Math.max(workArea.y, Math.min(bounds.y, maxY))),
    width,
    height,
  }
}

export function tileWindowBounds(count: number, workArea: Bounds): Bounds[] {
  if (count <= 0) return []
  const columns = Math.ceil(Math.sqrt(count * (workArea.width / Math.max(1, workArea.height))))
  const rows = Math.ceil(count / columns)
  const cellWidth = Math.floor(workArea.width / columns)
  const cellHeight = Math.floor(workArea.height / rows)
  return Array.from({ length: count }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const lastColumn = column === columns - 1
    const lastRow = row === rows - 1
    return {
      x: workArea.x + column * cellWidth,
      y: workArea.y + row * cellHeight,
      width: lastColumn ? workArea.width - column * cellWidth : cellWidth,
      height: lastRow ? workArea.height - row * cellHeight : cellHeight,
    }
  })
}

export function reflowWindows(windows: readonly DesktopWindowState[], workArea: Bounds): DesktopWindowState[] {
  return windows.map(window => {
    if (window.state === 'zoomed') {
      return { ...window, bounds: { ...workArea } }
    }
    return {
      ...window,
      bounds: clampWindowBounds(window.bounds, workArea),
      ...(window.restoreBounds === undefined
        ? {}
        : { restoreBounds: clampWindowBounds(window.restoreBounds, workArea) }),
    }
  })
}
