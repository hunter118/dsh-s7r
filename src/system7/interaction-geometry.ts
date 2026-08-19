export interface Point { x: number; y: number }
export interface Size { width: number; height: number }

export function toLogicalPoint(clientX: number, clientY: number, frameLeft: number, frameTop: number, pixelScale: number): Point {
  const scale = Number.isFinite(pixelScale) && pixelScale > 0 ? pixelScale : 1
  return { x: Math.round((clientX - frameLeft) / scale), y: Math.round((clientY - frameTop) / scale) }
}

export function clampOverlay(anchor: Point, overlay: Size, desktop: Size, margin = 2): Point {
  const maxX = Math.max(margin, desktop.width - overlay.width - margin)
  const maxY = Math.max(margin, desktop.height - overlay.height - margin)
  return {
    x: Math.max(margin, Math.min(maxX, anchor.x)),
    y: Math.max(margin, Math.min(maxY, anchor.y)),
  }
}

export function placeBalloon(pointer: Point, balloon: Size, desktop: Size, menuHeight: number): Point {
  const margin = 3
  const gap = 12
  const below = { x: pointer.x + 8, y: pointer.y + gap }
  const aboveY = pointer.y - balloon.height - gap
  const anchor = below.y + balloon.height > desktop.height - margin && aboveY >= menuHeight + margin
    ? { x: pointer.x + 8, y: aboveY }
    : below
  const clamped = clampOverlay(anchor, balloon, desktop, margin)
  return { ...clamped, y: Math.max(menuHeight + margin, clamped.y) }
}
