import type { BaseFontSize } from './resolution.ts'

export type AppId =
  | 'knowledge-desk'
  | 'finder'
  | 'textedit'
  | 'preview'
  | 'terminal'
  | 'timeline'
  | 'scrapbook'
  | 'clock'
  | 'puzzle'
  | 'monitor'
  | 'settings'
  | 'control-panel'
  | 'find'
  | 'trash'
  | 'dsh-control'
  | 'stationery'
  | 'agent-setup'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DesktopWindowState {
  id: string
  appId: AppId
  title: string
  bounds: Bounds
  restoreBounds?: Bounds | undefined
  zIndex: number
  state: 'normal' | 'zoomed' | 'collapsed'
  payload?: Record<string, unknown> | undefined
  resizable?: boolean | undefined
}

export interface WindowLayoutEntry {
  id: string
  bounds: Bounds
  restoreBounds?: Bounds | undefined
  state: DesktopWindowState['state']
}

export interface DesktopState {
  windows: DesktopWindowState[]
  activeId?: string | undefined
  nextId: number
  nextZ: number
  layoutRestore?: WindowLayoutEntry[] | undefined
}

export type WindowAction =
  | { type: 'open'; appId: AppId; title: string; bounds?: Bounds; payload?: Record<string, unknown>; resizable?: boolean; workArea?: Bounds; baseFontSize?: BaseFontSize }
  | { type: 'close'; id: string }
  | { type: 'close-session'; sessionId: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; x: number; y: number; workArea: Bounds }
  | { type: 'resize'; id: string; width: number; height: number; workArea: Bounds }
  | { type: 'zoom'; id: string; workArea: Bounds }
  | { type: 'collapse'; id: string }
  | { type: 'tile'; workArea: Bounds }
  | { type: 'restore-layout'; workArea: Bounds }
  | { type: 'reflow'; workArea: Bounds }
  | { type: 'rescale-ui'; ratio: number; oldMenuBarHeight: number; workArea: Bounds }
  | { type: 'retitle'; id: string; title: string }
