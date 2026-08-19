import { clampWindowBounds, tileWindowBounds, uiMetrics } from './resolution.ts'
import type { AppId, Bounds, DesktopState, DesktopWindowState, WindowAction } from './types.ts'

const DEFAULT_BOUNDS: Record<AppId, Bounds> = {
  'knowledge-desk': { x: 24, y: 32, width: 620, height: 410 },
  finder: { x: 54, y: 50, width: 390, height: 280 },
  textedit: { x: 74, y: 44, width: 440, height: 320 },
  preview: { x: 88, y: 40, width: 460, height: 340 },
  terminal: { x: 42, y: 74, width: 520, height: 280 },
  timeline: { x: 104, y: 36, width: 430, height: 340 },
  scrapbook: { x: 72, y: 62, width: 520, height: 300 },
  clock: { x: 760, y: 30, width: 130, height: 90 },
  puzzle: { x: 650, y: 42, width: 226, height: 260 },
  monitor: { x: 600, y: 50, width: 300, height: 210 },
  settings: { x: 116, y: 48, width: 430, height: 320 },
  'control-panel': { x: 146, y: 58, width: 370, height: 300 },
  find: { x: 92, y: 40, width: 520, height: 360 },
  trash: { x: 174, y: 74, width: 430, height: 280 },
}

export const EMPTY_DESKTOP_STATE: DesktopState = {
  windows: [],
  nextId: 1,
  nextZ: 1,
}

function updateWindow(
  state: DesktopState,
  id: string,
  update: (window: DesktopWindowState) => DesktopWindowState,
): DesktopState {
  if (!state.windows.some(window => window.id === id)) return state
  return { ...state, windows: state.windows.map(window => window.id === id ? update(window) : window) }
}

function withFocus(state: DesktopState, id: string): DesktopState {
  if (!state.windows.some(window => window.id === id)) return state
  const zIndex = state.nextZ
  return {
    ...state,
    activeId: id,
    nextZ: zIndex + 1,
    windows: state.windows.map(window => window.id === id ? { ...window, zIndex } : window),
  }
}

export function windowReducer(state: DesktopState, action: WindowAction): DesktopState {
  switch (action.type) {
    case 'open': {
      const id = `${action.appId}-${state.nextId}`
      const baseFontSize = action.baseFontSize ?? 10
      const ratio = baseFontSize / 10
      const offset = ((state.nextId - 1) % 7) * Math.round(10 * ratio)
      const compactBase = DEFAULT_BOUNDS[action.appId]
      const base = action.bounds ?? {
        x: Math.round(compactBase.x * ratio),
        y: uiMetrics(baseFontSize).menuBarHeight + Math.round((compactBase.y - uiMetrics(10).menuBarHeight) * ratio),
        width: Math.round(compactBase.width * ratio),
        height: Math.round(compactBase.height * ratio),
      }
      const cascaded = { ...base, x: base.x + offset, y: base.y + offset }
      const bounds = action.workArea === undefined ? cascaded : clampWindowBounds(cascaded, action.workArea)
      const window: DesktopWindowState = {
        id,
        appId: action.appId,
        title: action.title,
        bounds,
        zIndex: state.nextZ,
        state: 'normal',
        ...(action.payload === undefined ? {} : { payload: action.payload }),
        ...(action.resizable === undefined ? {} : { resizable: action.resizable }),
      }
      return {
        windows: [...state.windows, window],
        activeId: id,
        nextId: state.nextId + 1,
        nextZ: state.nextZ + 1,
      }
    }
    case 'close': {
      const windows = state.windows.filter(window => window.id !== action.id)
      const top = [...windows].sort((a, b) => b.zIndex - a.zIndex)[0]
      return { ...state, windows, ...(top === undefined ? { activeId: undefined } : { activeId: top.id }) }
    }
    case 'close-session': {
      const windows = state.windows.filter(window => window.payload?.sessionId !== action.sessionId)
      const top = [...windows].sort((a, b) => b.zIndex - a.zIndex)[0]
      return { ...state, windows, ...(top === undefined ? { activeId: undefined } : { activeId: top.id }) }
    }
    case 'focus':
      return withFocus(state, action.id)
    case 'move':
      return updateWindow(state, action.id, window => ({
        ...window,
        bounds: clampWindowBounds({ ...window.bounds, x: action.x, y: action.y }, action.workArea),
      }))
    case 'resize':
      return updateWindow(state, action.id, window => ({
        ...window,
        bounds: clampWindowBounds({ ...window.bounds, width: action.width, height: action.height }, action.workArea),
      }))
    case 'zoom':
      return updateWindow(withFocus(state, action.id), action.id, window => window.state === 'zoomed'
        ? { ...window, bounds: window.restoreBounds ?? window.bounds, restoreBounds: undefined, state: 'normal' }
        : { ...window, restoreBounds: window.bounds, bounds: { ...action.workArea }, state: 'zoomed' })
    case 'collapse':
      return updateWindow(withFocus(state, action.id), action.id, window => ({
        ...window,
        state: window.state === 'collapsed' ? 'normal' : 'collapsed',
      }))
    case 'tile': {
      const visible = state.windows.filter(window => window.state !== 'collapsed')
      const tiled = tileWindowBounds(visible.length, action.workArea)
      let cursor = 0
      return {
        ...state,
        layoutRestore: state.layoutRestore ?? state.windows.map(window => ({
          id: window.id,
          bounds: { ...window.bounds },
          ...(window.restoreBounds === undefined ? {} : { restoreBounds: { ...window.restoreBounds } }),
          state: window.state,
        })),
        windows: state.windows.map(window => window.state === 'collapsed'
          ? window
          : { ...window, bounds: tiled[cursor++]!, restoreBounds: undefined, state: 'normal' }),
      }
    }
    case 'restore-layout': {
      if (state.layoutRestore === undefined) return state
      const saved = new Map(state.layoutRestore.map(entry => [entry.id, entry]))
      return {
        ...state,
        layoutRestore: undefined,
        windows: state.windows.map(window => {
          const entry = saved.get(window.id)
          if (entry === undefined) return window
          const bounds = entry.state === 'zoomed' ? { ...action.workArea } : clampWindowBounds(entry.bounds, action.workArea)
          return {
            ...window,
            bounds,
            state: entry.state,
            ...(entry.restoreBounds === undefined
              ? { restoreBounds: undefined }
              : { restoreBounds: clampWindowBounds(entry.restoreBounds, action.workArea) }),
          }
        }),
      }
    }
    case 'reflow':
      return {
        ...state,
        windows: state.windows.map(window => window.state === 'zoomed'
          ? { ...window, bounds: { ...action.workArea } }
          : { ...window, bounds: clampWindowBounds(window.bounds, action.workArea) }),
        layoutRestore: state.layoutRestore?.map(entry => ({
          ...entry,
          bounds: entry.state === 'zoomed' ? { ...action.workArea } : clampWindowBounds(entry.bounds, action.workArea),
          ...(entry.restoreBounds === undefined ? {} : { restoreBounds: clampWindowBounds(entry.restoreBounds, action.workArea) }),
        })),
      }
    case 'rescale-ui': {
      const resizeBounds = (bounds: Bounds): Bounds => clampWindowBounds({
        x: Math.round(bounds.x * action.ratio),
        y: action.workArea.y + Math.round((bounds.y - action.oldMenuBarHeight) * action.ratio),
        width: Math.round(bounds.width * action.ratio),
        height: Math.round(bounds.height * action.ratio),
      }, action.workArea)
      return {
        ...state,
        windows: state.windows.map(window => window.state === 'zoomed'
          ? { ...window, bounds: { ...action.workArea }, restoreBounds: window.restoreBounds === undefined ? undefined : resizeBounds(window.restoreBounds) }
          : { ...window, bounds: resizeBounds(window.bounds), restoreBounds: window.restoreBounds === undefined ? undefined : resizeBounds(window.restoreBounds) }),
        layoutRestore: state.layoutRestore?.map(entry => ({
          ...entry,
          bounds: entry.state === 'zoomed' ? { ...action.workArea } : resizeBounds(entry.bounds),
          ...(entry.restoreBounds === undefined ? {} : { restoreBounds: resizeBounds(entry.restoreBounds) }),
        })),
      }
    }
    case 'retitle':
      return updateWindow(state, action.id, window => ({ ...window, title: action.title }))
  }
}
