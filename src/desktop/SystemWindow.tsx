import { useRef } from 'react'
import { logicalPointerDelta, uiMetrics, type BaseFontSize, type PixelScale } from './resolution.ts'
import type { DesktopWindowState } from './types.ts'

export interface SystemWindowProps {
  window: DesktopWindowState
  active: boolean
  baseFontSize: BaseFontSize
  pixelScale: PixelScale
  children: React.ReactNode
  onFocus: () => void
  onClose: () => void
  onMove: (x: number, y: number) => void
  onResize: (width: number, height: number) => void
  onZoom: () => void
  onCollapse: () => void
}

export function SystemWindow({ window, active, baseFontSize, pixelScale, children, onFocus, onClose, onMove, onResize, onZoom, onCollapse }: SystemWindowProps) {
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null)
  const resize = useRef<{ pointerId: number; startX: number; startY: number; width: number; height: number } | null>(null)
  const collapsed = window.state === 'collapsed'
  return <section
    className="kd-window"
    data-app={window.appId}
    data-active={active}
    data-collapsed={collapsed || undefined}
    style={{
      left: window.bounds.x,
      top: window.bounds.y,
      width: window.bounds.width,
      height: collapsed ? uiMetrics(baseFontSize).titleBarHeight : window.bounds.height,
      zIndex: window.zIndex,
    }}
    onPointerDown={onFocus}
    aria-label={`${window.title} window`}
  >
    <header className="kd-title-bar"
      onDoubleClick={event => { if ((event.target as HTMLElement).closest('button') === null) onZoom() }}
      onPointerDown={event => {
        if (window.state === 'zoomed' || (event.target as HTMLElement).closest('button') !== null) return
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onFocus()
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: window.bounds.x, y: window.bounds.y }
      }}
      onPointerMove={event => {
        const state = drag.current
        if (state === null || state.pointerId !== event.pointerId) return
        onMove(state.x + logicalPointerDelta(event.clientX - state.startX, pixelScale), state.y + logicalPointerDelta(event.clientY - state.startY, pixelScale))
      }}
      onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId) } }}
    >
      <button className="kd-close" aria-label={`Close ${window.title}`} data-balloon={`Close ${window.title}`} onClick={event => { event.stopPropagation(); onClose() }} />
      <span className="kd-title">{window.title}</span>
      <span className="kd-title-controls"><button className="kd-collapse" aria-label={collapsed ? 'Expand window' : 'Collapse window'} data-balloon={collapsed ? 'Expand this window' : 'Collapse this window to its title bar'} onClick={event => { event.stopPropagation(); onCollapse() }}>—</button><button className="kd-zoom" aria-label="Zoom window" data-balloon="Zoom or restore this window" onClick={event => { event.stopPropagation(); onZoom() }} /></span>
    </header>
    <div className="kd-window-body">{children}</div>
    {!collapsed && window.resizable !== false ? <div className="kd-resizer" data-balloon="Drag to resize this window"
      onPointerDown={event => {
        event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); onFocus()
        resize.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, width: window.bounds.width, height: window.bounds.height }
      }}
      onPointerMove={event => {
        const state = resize.current
        if (state === null || state.pointerId !== event.pointerId) return
        onResize(state.width + logicalPointerDelta(event.clientX - state.startX, pixelScale), state.height + logicalPointerDelta(event.clientY - state.startY, pixelScale))
      }}
      onPointerUp={event => { if (resize.current?.pointerId === event.pointerId) { resize.current = null; event.currentTarget.releasePointerCapture(event.pointerId) } }}
    /> : null}
  </section>
}
