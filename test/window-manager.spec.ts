import { describe, expect, it } from 'vitest'
import { desktopWorkArea } from '../src/desktop/resolution.ts'
import { EMPTY_DESKTOP_STATE, windowReducer } from '../src/desktop/window-manager.ts'

describe('window manager', () => {
  const area = desktopWorkArea(832, 624)

  it('opens, focuses, moves, and closes windows with stable z-order', () => {
    let state = windowReducer(EMPTY_DESKTOP_STATE, { type: 'open', appId: 'finder', title: 'Finder' })
    state = windowReducer(state, { type: 'open', appId: 'monitor', title: 'Monitor' })
    expect(state.windows).toHaveLength(2)
    const first = state.windows[0]!
    state = windowReducer(state, { type: 'focus', id: first.id })
    expect(state.activeId).toBe(first.id)
    expect(state.windows[0]!.zIndex).toBeGreaterThan(state.windows[1]!.zIndex)
    state = windowReducer(state, { type: 'move', id: first.id, x: -100, y: -100, workArea: area })
    expect(state.windows[0]!.bounds.x).toBe(0)
    expect(state.windows[0]!.bounds.y).toBe(18)
    state = windowReducer(state, { type: 'close', id: first.id })
    expect(state.windows).toHaveLength(1)
  })

  it('closes every window owned by an archived session', () => {
    let state = windowReducer(EMPTY_DESKTOP_STATE, { type: 'open', appId: 'knowledge-desk', title: 'Agent', payload: { sessionId: 'one' } })
    state = windowReducer(state, { type: 'open', appId: 'terminal', title: 'Terminal', payload: { sessionId: 'one' } })
    state = windowReducer(state, { type: 'open', appId: 'knowledge-desk', title: 'Knowledge Desk' })
    state = windowReducer(state, { type: 'close-session', sessionId: 'one' })
    expect(state.windows).toHaveLength(1)
    expect(state.windows[0]!.title).toBe('Knowledge Desk')
  })

  it('clamps newly opened windows to a classic 512 × 342 desktop', () => {
    const classicArea = desktopWorkArea(512, 342)
    const state = windowReducer(EMPTY_DESKTOP_STATE, { type: 'open', appId: 'control-panel', title: 'Display', workArea: classicArea })
    const bounds = state.windows[0]!.bounds
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(512)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(342)
  })

  it('round-trips zoom and collapse', () => {
    let state = windowReducer(EMPTY_DESKTOP_STATE, { type: 'open', appId: 'textedit', title: 'Doc' })
    const id = state.windows[0]!.id
    const original = state.windows[0]!.bounds
    state = windowReducer(state, { type: 'zoom', id, workArea: area })
    expect(state.windows[0]!.state).toBe('zoomed')
    expect(state.windows[0]!.bounds).toEqual(area)
    state = windowReducer(state, { type: 'zoom', id, workArea: area })
    expect(state.windows[0]!.bounds).toEqual(original)
    state = windowReducer(state, { type: 'collapse', id })
    expect(state.windows[0]!.state).toBe('collapsed')
    state = windowReducer(state, { type: 'collapse', id })
    expect(state.windows[0]!.state).toBe('normal')
  })

  it('tiles only non-collapsed windows', () => {
    let state = EMPTY_DESKTOP_STATE
    for (let index = 0; index < 4; index += 1) state = windowReducer(state, { type: 'open', appId: 'finder', title: `F${index}` })
    const collapsed = state.windows[1]!.id
    state = windowReducer(state, { type: 'collapse', id: collapsed })
    const old = state.windows[1]!.bounds
    state = windowReducer(state, { type: 'tile', workArea: area })
    expect(state.windows[1]!.bounds).toEqual(old)
    expect(state.windows.filter(window => window.state !== 'collapsed')).toHaveLength(3)
  })

  it('rescales existing windows when the base type size changes', () => {
    const compactArea = desktopWorkArea(832, 624, 10)
    const comfortableArea = desktopWorkArea(832, 624, 12)
    let state = windowReducer(EMPTY_DESKTOP_STATE, { type: 'open', appId: 'finder', title: 'Finder', workArea: compactArea, baseFontSize: 10 })
    const compact = state.windows[0]!.bounds
    state = windowReducer(state, { type: 'rescale-ui', ratio: 1.2, oldMenuBarHeight: compactArea.y, workArea: comfortableArea })
    expect(state.windows[0]!.bounds).toEqual({
      x: Math.round(compact.x * 1.2),
      y: comfortableArea.y + Math.round((compact.y - compactArea.y) * 1.2),
      width: Math.round(compact.width * 1.2),
      height: Math.round(compact.height * 1.2),
    })
  })
})
