import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { placeBalloon, toLogicalPoint, type Point, type Size } from './interaction-geometry.ts'

interface BalloonState { text: string; pointer: Point }

export function BalloonHelp({ enabled, desktopRef, desktopSize, pixelScale, menuHeight, blocked }: {
  enabled: boolean
  desktopRef: RefObject<HTMLElement | null>
  desktopSize: Size
  pixelScale: number
  menuHeight: number
  blocked: boolean
}) {
  const [balloon, setBalloon] = useState<BalloonState | null>(null)
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 })
  const balloonRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = desktopRef.current
    if (!enabled || blocked || root === null) { setBalloon(null); return }
    let timer: number | undefined
    let target: HTMLElement | null = null
    let pointer: Point = { x: 0, y: 0 }
    const clear = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; target = null; setBalloon(null) }
    const point = (clientX: number, clientY: number) => {
      const bounds = root.getBoundingClientRect()
      return toLogicalPoint(clientX, clientY, bounds.left, bounds.top, pixelScale)
    }
    const schedule = (next: HTMLElement, nextPointer: Point) => {
      clear(); target = next; pointer = nextPointer
      timer = window.setTimeout(() => {
        const text = target?.dataset.balloon?.trim()
        if (text !== undefined && text !== '') setBalloon({ text, pointer })
      }, 650)
    }
    const over = (event: PointerEvent) => {
      const next = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-balloon]') ?? null
      if (next === null || !root.contains(next) || next.dataset.balloon?.trim() === '') { clear(); return }
      if (next === target) return
      schedule(next, point(event.clientX, event.clientY))
    }
    const move = (event: PointerEvent) => { pointer = point(event.clientX, event.clientY) }
    const out = (event: PointerEvent) => {
      if (target === null) return
      const related = event.relatedTarget as Node | null
      if (related === null || !target.contains(related)) clear()
    }
    const focusIn = (event: FocusEvent) => {
      const next = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-balloon]') ?? null
      if (next === null || !root.contains(next) || next.dataset.balloon?.trim() === '') return
      const bounds = next.getBoundingClientRect()
      schedule(next, point(bounds.left + bounds.width / 2, bounds.bottom))
    }
    const focusOut = (event: FocusEvent) => {
      const related = event.relatedTarget as Node | null
      if (target !== null && (related === null || !target.contains(related))) clear()
    }
    root.addEventListener('pointerover', over); root.addEventListener('pointermove', move); root.addEventListener('pointerout', out)
    root.addEventListener('focusin', focusIn); root.addEventListener('focusout', focusOut)
    root.addEventListener('pointerdown', clear); root.addEventListener('contextmenu', clear); root.addEventListener('wheel', clear, { capture: true })
    window.addEventListener('blur', clear); window.addEventListener('resize', clear)
    return () => { clear(); root.removeEventListener('pointerover', over); root.removeEventListener('pointermove', move); root.removeEventListener('pointerout', out); root.removeEventListener('focusin', focusIn); root.removeEventListener('focusout', focusOut); root.removeEventListener('pointerdown', clear); root.removeEventListener('contextmenu', clear); root.removeEventListener('wheel', clear, { capture: true }); window.removeEventListener('blur', clear); window.removeEventListener('resize', clear) }
  }, [blocked, desktopRef, enabled, pixelScale])
  useLayoutEffect(() => {
    const element = balloonRef.current
    if (balloon === null || element === null) return
    setPosition(placeBalloon(balloon.pointer, { width: element.offsetWidth, height: element.offsetHeight }, desktopSize, menuHeight))
  }, [balloon, desktopSize, menuHeight])
  if (balloon === null) return null
  return <div ref={balloonRef} className="s7-balloon-help" data-side={position.y < balloon.pointer.y ? 'above' : 'below'} role="tooltip" style={{ left: position.x, top: position.y }}>{balloon.text}</div>
}
