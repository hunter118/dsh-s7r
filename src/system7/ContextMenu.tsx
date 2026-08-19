import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { clampOverlay, type Point, type Size } from './interaction-geometry.ts'

export type ContextMenuItem =
  | { kind?: 'item'; label: string; action: () => void; disabled?: boolean; checked?: boolean }
  | { kind: 'separator' }
  | { kind: 'heading'; label: string }

export interface ContextMenuModel {
  anchor: Point
  items: ContextMenuItem[]
}

export function ContextMenu({ model, desktopSize, onClose }: { model: ContextMenuModel; desktopSize: Size; onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState(model.anchor)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return
    setPosition(clampOverlay(model.anchor, { width: element.offsetWidth, height: element.offsetHeight }, desktopSize))
    window.setTimeout(() => { element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus() }, 0)
  }, [desktopSize, model])
  useEffect(() => {
    const close = () => { onClose() }
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    window.addEventListener('wheel', close, { capture: true })
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('blur', close); window.removeEventListener('resize', close); window.removeEventListener('wheel', close, { capture: true }) }
  }, [onClose])
  return <div ref={ref} className="s7-context-menu" role="menu" style={{ left: position.x, top: position.y }} onPointerDown={event => { event.stopPropagation() }} onContextMenu={event => { event.preventDefault(); event.stopPropagation() }} onKeyDown={event => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus() }
    else if (event.key === 'Home') { event.preventDefault(); buttons[0]?.focus() }
    else if (event.key === 'End') { event.preventDefault(); buttons.at(-1)?.focus() }
    else if (event.key === 'Escape') { event.preventDefault(); onClose() }
  }}>{model.items.map((item, index) => item.kind === 'separator'
      ? <div className="s7-context-separator" key={index} />
      : item.kind === 'heading' ? <div className="s7-context-heading" key={`${item.label}-${index}`}>{item.label}</div>
        : <button role="menuitem" key={`${item.label}-${index}`} disabled={item.disabled} onClick={() => { onClose(); item.action() }}><span>{item.checked ? 'x' : ''}</span>{item.label}</button>)}</div>
}
