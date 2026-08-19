import type { AppId, Bounds, DesktopState, DesktopWindowState, WindowLayoutEntry } from '../desktop/types.ts'

export type DesktopShortcut =
  | { id: string; kind: 'workspace'; label: string; workspaceId: string; path: string; x: number; y: number }
  | { id: string; kind: 'agent'; label: string; sessionId: string; cwd?: string; x: number; y: number }
  | { id: string; kind: 'path'; label: string; sessionId: string; path: string; pathType: 'file' | 'directory'; folderAction?: 'browse' | 'workspace'; x: number; y: number }
  | { id: string; kind: 'scrapbook'; label: string; cardId: string; x: number; y: number }

export interface ArchivedAgentRecord {
  sessionId: string
  title: string
  cwd?: string
  archivedAt: number
}

export interface TrashedShortcutRecord {
  shortcut: DesktopShortcut
  trashedAt: number
}

export interface DesktopPersistence {
  version: 2
  desktop: DesktopState
  shortcuts: DesktopShortcut[]
  archivedAgents: ArchivedAgentRecord[]
  trash: TrashedShortcutRecord[]
  renderMarkdown: boolean
}

export const DESKTOP_STORAGE_KEY = 's7r.desktop.v1'

const APP_IDS: readonly AppId[] = ['knowledge-desk', 'finder', 'textedit', 'preview', 'terminal', 'timeline', 'scrapbook', 'clock', 'puzzle', 'monitor', 'settings', 'control-panel', 'find', 'trash']

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function validBounds(value: unknown): value is Bounds {
  if (typeof value !== 'object' || value === null) return false
  const bounds = value as Partial<Bounds>
  return finite(bounds.x) && finite(bounds.y) && finite(bounds.width) && finite(bounds.height) && bounds.width >= 120 && bounds.height >= 60
}

function validPayload(value: unknown): value is Record<string, unknown> {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value).every(item => item === undefined || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
}

function validWindow(value: unknown): value is DesktopWindowState {
  if (typeof value !== 'object' || value === null) return false
  const window = value as Partial<DesktopWindowState>
  return typeof window.id === 'string' && APP_IDS.includes(window.appId as AppId) && typeof window.title === 'string'
    && validBounds(window.bounds) && finite(window.zIndex) && (window.state === 'normal' || window.state === 'zoomed' || window.state === 'collapsed')
    && (window.restoreBounds === undefined || validBounds(window.restoreBounds)) && validPayload(window.payload)
}

function validLayoutEntry(value: unknown): value is WindowLayoutEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<WindowLayoutEntry>
  return typeof entry.id === 'string' && validBounds(entry.bounds)
    && (entry.state === 'normal' || entry.state === 'zoomed' || entry.state === 'collapsed')
    && (entry.restoreBounds === undefined || validBounds(entry.restoreBounds))
}

function validShortcut(value: unknown): value is DesktopShortcut {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || typeof item.label !== 'string' || !finite(item.x) || !finite(item.y)) return false
  if (item.kind === 'workspace') return typeof item.workspaceId === 'string' && typeof item.path === 'string'
  if (item.kind === 'agent') return typeof item.sessionId === 'string' && (item.cwd === undefined || typeof item.cwd === 'string')
  if (item.kind === 'path') return typeof item.sessionId === 'string' && typeof item.path === 'string' && (item.pathType === 'file' || item.pathType === 'directory') && (item.folderAction === undefined || item.folderAction === 'browse' || item.folderAction === 'workspace')
  return item.kind === 'scrapbook' && typeof item.cardId === 'string'
}

function validArchived(value: unknown): value is ArchivedAgentRecord {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<ArchivedAgentRecord>
  return typeof item.sessionId === 'string' && typeof item.title === 'string' && (item.cwd === undefined || typeof item.cwd === 'string') && finite(item.archivedAt)
}

function validTrashed(value: unknown): value is TrashedShortcutRecord {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<TrashedShortcutRecord>
  return validShortcut(item.shortcut) && finite(item.trashedAt)
}

export const EMPTY_DESKTOP_PERSISTENCE: DesktopPersistence = Object.freeze({
  version: 2,
  desktop: { windows: [], nextId: 1, nextZ: 1 },
  shortcuts: [],
  archivedAgents: [],
  trash: [],
  renderMarkdown: true,
})

export function readDesktopPersistence(storage: Pick<Storage, 'getItem'> | undefined): DesktopPersistence {
  if (storage === undefined) return EMPTY_DESKTOP_PERSISTENCE
  try {
    const raw = storage.getItem(DESKTOP_STORAGE_KEY)
    if (raw === null) return EMPTY_DESKTOP_PERSISTENCE
    const value = JSON.parse(raw) as Partial<Omit<DesktopPersistence, 'version'>> & { version?: 1 | 2 }
    if ((value.version !== 1 && value.version !== 2) || typeof value.desktop !== 'object' || value.desktop === null || !Array.isArray(value.shortcuts) || !Array.isArray(value.archivedAgents)) return EMPTY_DESKTOP_PERSISTENCE
    const state = value.desktop as Partial<DesktopState>
    if (!Array.isArray(state.windows) || !state.windows.every(validWindow) || !finite(state.nextId) || !finite(state.nextZ) || (state.activeId !== undefined && typeof state.activeId !== 'string') || (state.layoutRestore !== undefined && (!Array.isArray(state.layoutRestore) || !state.layoutRestore.every(validLayoutEntry)))) return EMPTY_DESKTOP_PERSISTENCE
    if (!value.shortcuts.every(validShortcut) || !value.archivedAgents.every(validArchived)) return EMPTY_DESKTOP_PERSISTENCE
    if (value.version === 2 && (!Array.isArray(value.trash) || !value.trash.every(validTrashed) || typeof value.renderMarkdown !== 'boolean')) return EMPTY_DESKTOP_PERSISTENCE
    const trash = value.version === 2 ? value.trash as TrashedShortcutRecord[] : []
    const renderMarkdown = value.version === 2 ? value.renderMarkdown as boolean : true
    const windows = state.windows.filter(window => window.appId !== 'terminal')
    const activeId = windows.some(window => window.id === state.activeId) ? state.activeId : undefined
    const liveIds = new Set(windows.map(window => window.id))
    const layoutRestore = state.layoutRestore?.filter(entry => liveIds.has(entry.id))
    return { version: 2, desktop: { windows, nextId: state.nextId, nextZ: state.nextZ, ...(activeId === undefined ? {} : { activeId }), ...(layoutRestore === undefined || layoutRestore.length === 0 ? {} : { layoutRestore }) }, shortcuts: value.shortcuts, archivedAgents: value.archivedAgents, trash, renderMarkdown }
  } catch {
    return EMPTY_DESKTOP_PERSISTENCE
  }
}

export function writeDesktopPersistence(storage: Pick<Storage, 'setItem'> | undefined, value: DesktopPersistence): void {
  try {
    const windows = value.desktop.windows.filter(window => window.appId !== 'terminal')
    const activeId = windows.some(window => window.id === value.desktop.activeId) ? value.desktop.activeId : undefined
    storage?.setItem(DESKTOP_STORAGE_KEY, JSON.stringify({ ...value, desktop: { ...value.desktop, windows, ...(activeId === undefined ? { activeId: undefined } : { activeId }) } }))
  } catch {
    // A full local store must never break the live desktop.
  }
}

export function shortcutId(kind: DesktopShortcut['kind'], identity: string): string {
  return `${kind}:${identity}`
}
