import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DshClientAdapter } from '../dsh-compat/client.ts'
import { AccessoriesStylesBridge, AppStylesBridge } from './style-bridge.tsx'
import { DisplayControlPanel, ClockApp, MonitorApp, PuzzleApp, ScrapbookApp, SettingsApp, TimelineApp, TrashApp, type MonitorTaskView } from '../apps/accessories/Accessories.tsx'
import { FinderApp, PreviewApp, TerminalApp, TextEditApp } from '../apps/files/FileApps.tsx'
import { KnowledgeDeskApp } from '../apps/knowledge-desk/KnowledgeDeskApp.tsx'
import { FindApp } from '../apps/find/FindApp.tsx'
import { pathBasename, pathExtension } from '../apps/common.tsx'
import { readDisplayPreferences, writeDisplayPreferences, type DisplayPreferences } from '../display/preferences.ts'
import { desktopWorkArea, resolveDesktopSize, uiMetrics } from './resolution.ts'
import { windowReducer } from './window-manager.ts'
import type { AppId, Bounds, DesktopWindowState } from './types.ts'
import { MenuBar } from './MenuBar.tsx'
import { SystemWindow } from './SystemWindow.tsx'
import { AppIcon, SystemButton, SystemDialog } from '../system7/primitives.tsx'
import { readScrapbook, writeScrapbook, type ScrapbookCard } from '../storage/scrapbook.ts'
import { readImportedWallpapers, writeImportedWallpapers, type ImportedWallpaper, type ImportedWallpaperLibrary } from '../storage/wallpaper.ts'
import { buildSeamlessCatTile, filterWallpaperSource } from '../display/wallpaper.ts'
import catWallpaperSprite from '../assets/cat-wallpaper-sprite.png'
import { readDesktopPersistence, shortcutId, writeDesktopPersistence, type ArchivedAgentRecord, type DesktopShortcut, type TrashedShortcutRecord } from '../storage/desktop.ts'
import { readDragItem, writeDragItem, type S7RDragItem } from './drag.ts'
import { moveShortcutGroup, normalizedSelectionRect, shortcutsInRect, type SelectionRect } from './selection.ts'

export type DesktopRootProps = PropsRuntime<'root'> & { adapter: DshClientAdapter }

const CLASSIC_WALLPAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' fill='%23888'/%3E%3Crect x='2' y='2' width='1' height='1' fill='%23ddd'/%3E%3C/svg%3E")`
interface RenderedCatWallpaper { dataUrl: string; width: number }
const catWallpaperCache = new Map<string, Promise<RenderedCatWallpaper>>()
let catTileSource: Promise<string> | undefined

function loadCatWallpaper(mode: DisplayPreferences['wallpaperFilterMode'], pixelSize: DisplayPreferences['wallpaperPixelSize']): Promise<RenderedCatWallpaper> {
  const key = `${mode}:${pixelSize}`
  const cached = catWallpaperCache.get(key)
  if (cached !== undefined) return cached
  catTileSource ??= buildSeamlessCatTile(catWallpaperSprite)
  const pending = catTileSource.then(source => filterWallpaperSource(source, mode, 384, pixelSize)).then(value => ({ dataUrl: value.dataUrl, width: value.width }))
  catWallpaperCache.set(key, pending)
  return pending
}

function appTitle(appId: AppId): string {
  return appId === 'control-panel' ? 'Display' : appId === 'knowledge-desk' ? 'Knowledge Desk' : appId === 'find' ? 'Find' : appId[0]!.toUpperCase() + appId.slice(1)
}

function valueOf(payload: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = payload?.[key]
  return typeof value === 'string' ? value : undefined
}

function parentDirectory(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '')
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return index <= 0 ? normalized : normalized.slice(0, index)
}

function dragItemOf(shortcut: DesktopShortcut, selectedIds: readonly string[]): S7RDragItem {
  const group = selectedIds.includes(shortcut.id) && selectedIds.length > 1 ? { shortcutIds: [...selectedIds] } : {}
  if (shortcut.kind === 'workspace') return { kind: 'workspace', label: shortcut.label, workspaceId: shortcut.workspaceId, path: shortcut.path, shortcutId: shortcut.id, ...group }
  if (shortcut.kind === 'agent') return { kind: 'agent', label: shortcut.label, sessionId: shortcut.sessionId, ...(shortcut.cwd === undefined ? {} : { cwd: shortcut.cwd }), shortcutId: shortcut.id, ...group }
  if (shortcut.kind === 'path') return { kind: 'path', label: shortcut.label, sessionId: shortcut.sessionId, path: shortcut.path, pathType: shortcut.pathType, ...(shortcut.folderAction === undefined ? {} : { folderAction: shortcut.folderAction }), shortcutId: shortcut.id, ...group }
  return { kind: 'scrapbook', label: shortcut.label, cardId: shortcut.cardId, shortcutId: shortcut.id, ...group }
}

function shortcutFromDrag(item: S7RDragItem, x: number, y: number): DesktopShortcut {
  if (item.kind === 'workspace') return { id: shortcutId('workspace', item.workspaceId), kind: 'workspace', label: item.label, workspaceId: item.workspaceId, path: item.path, x, y }
  if (item.kind === 'agent') return { id: shortcutId('agent', item.sessionId), kind: 'agent', label: item.label, sessionId: item.sessionId, ...(item.cwd === undefined ? {} : { cwd: item.cwd }), x, y }
  if (item.kind === 'path') return { id: shortcutId('path', `${item.folderAction ?? 'file'}:${item.sessionId}:${item.path}`), kind: 'path', label: item.label, sessionId: item.sessionId, path: item.path, pathType: item.pathType, ...(item.folderAction === undefined ? {} : { folderAction: item.folderAction }), x, y }
  return { id: shortcutId('scrapbook', item.cardId), kind: 'scrapbook', label: item.label, cardId: item.cardId, x, y }
}

function downloadExport(value: { filename: string; mime: string; content: string }): void {
  const url = URL.createObjectURL(new Blob([value.content], { type: `${value.mime};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = value.filename; anchor.click()
  window.setTimeout(() => { URL.revokeObjectURL(url) }, 1000)
}

export function DesktopRoot({ adapter, useSessions, useWorkspaces }: DesktopRootProps) {
  const sessions = useSessions(state => state)
  const workspaces = useWorkspaces(state => state)
  const restored = useRef(readDesktopPersistence(window.localStorage)).current
  const [desktop, dispatch] = useReducer(windowReducer, restored.desktop)
  const [shortcuts, setShortcuts] = useState<DesktopShortcut[]>(restored.shortcuts)
  const [archivedAgents, setArchivedAgents] = useState<ArchivedAgentRecord[]>(restored.archivedAgents)
  const [trash, setTrash] = useState<TrashedShortcutRecord[]>(restored.trash)
  const [renderMarkdown, setRenderMarkdown] = useState(restored.renderMarkdown)
  const [preferences, setPreferences] = useState<DisplayPreferences>(() => readDisplayPreferences(window.localStorage))
  const [cards, setCards] = useState<ScrapbookCard[]>(() => readScrapbook(window.localStorage))
  const [wallpaperLibrary, setWallpaperLibrary] = useState<ImportedWallpaperLibrary>(() => readImportedWallpapers(window.localStorage))
  const [catWallpaper, setCatWallpaper] = useState<RenderedCatWallpaper | null>(null)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [now, setNow] = useState(() => new Date())
  const [pendingClose, setPendingClose] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [about, setAbout] = useState(false)
  const [help, setHelp] = useState(false)
  const [selectedShortcutIds, setSelectedShortcutIds] = useState<string[]>([])
  const [marquee, setMarquee] = useState<(SelectionRect & { pointerId: number; startX: number; startY: number; baseline: string[] }) | null>(null)
  const [pendingFolderShortcut, setPendingFolderShortcut] = useState<{ item: Extract<S7RDragItem, { kind: 'path' }>; x: number; y: number } | null>(null)
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)
  const [notices, setNotices] = useState<Array<{ id: string; sessionId: string; title: string }>>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | undefined>(() => workspaces.recentWorkspaceId === undefined ? undefined : String(workspaces.recentWorkspaceId))
  const dirty = useRef(new Map<string, boolean>())
  const initialWindowOpened = useRef(restored.desktop.windows.length > 0)
  const completionBaseline = useRef(false)
  const previousCompleted = useRef(new Map<string, boolean>())
  const previousBaseFontSize = useRef(preferences.baseFontSize)
  const productiveBoundsApplied = useRef(false)
  const desktopSize = resolveDesktopSize(preferences.resolution, viewport.width, viewport.height, preferences.pixelScale)
  const metrics = uiMetrics(preferences.baseFontSize)
  const visualWidth = desktopSize.width * preferences.pixelScale
  const visualHeight = desktopSize.height * preferences.pixelScale
  const frameLeft = Math.max(0, Math.floor((viewport.width - visualWidth) / 2))
  const frameTop = Math.max(0, Math.floor((viewport.height - visualHeight) / 2))
  const workArea = useMemo(() => desktopWorkArea(desktopSize.width, desktopSize.height, preferences.baseFontSize), [desktopSize.height, desktopSize.width, preferences.baseFontSize])
  const active = desktop.windows.find(window => window.id === desktop.activeId)
  const currentWorkspace = workspaces.items.find(item => String(item.workspaceId) === currentWorkspaceId)
  const importedWallpaper = wallpaperLibrary.items.find(item => item.id === wallpaperLibrary.selectedId) ?? null
  const wallpaperStyle = useMemo<CSSProperties>(() => {
    const tileOrCover = (dataUrl: string, tileSize: number): CSSProperties => preferences.wallpaperFit === 'cover'
      ? { backgroundColor: '#aaa', backgroundImage: `url(${dataUrl})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'cover', imageRendering: 'pixelated' }
      : { backgroundColor: '#aaa', backgroundImage: `url(${dataUrl})`, backgroundRepeat: 'repeat', backgroundPosition: '0 0', backgroundSize: `${tileSize}px auto`, imageRendering: 'pixelated' }
    switch (preferences.wallpaper) {
      case 'gray': return { backgroundColor: '#aaa', backgroundImage: 'none' }
      case 'pinstripe': return { backgroundColor: '#bbb', backgroundImage: 'repeating-linear-gradient(135deg,#888 0 1px,#ddd 1px 3px)', backgroundSize: 'auto' }
      case 'cat': return catWallpaper === null ? { backgroundColor: '#ccc', backgroundImage: 'none' } : tileOrCover(catWallpaper.dataUrl, catWallpaper.width)
      case 'custom': return importedWallpaper === null ? { backgroundColor: '#bbb', backgroundImage: CLASSIC_WALLPAPER } : tileOrCover(importedWallpaper.dataUrl, importedWallpaper.width)
      default: return { backgroundColor: '#bbb', backgroundImage: CLASSIC_WALLPAPER, backgroundRepeat: 'repeat', backgroundSize: '4px 4px' }
    }
  }, [catWallpaper, importedWallpaper, preferences.wallpaper, preferences.wallpaperFit])

  useEffect(() => {
    const listener = () => { setViewport({ width: window.innerWidth, height: window.innerHeight }) }
    window.addEventListener('resize', listener)
    return () => { window.removeEventListener('resize', listener) }
  }, [])
  useEffect(() => { const timer = window.setInterval(() => { setNow(new Date()) }, 1000); return () => { window.clearInterval(timer) } }, [])
  useEffect(() => { writeDisplayPreferences(window.localStorage, preferences) }, [preferences])
  useEffect(() => {
    if (preferences.wallpaper !== 'cat') return
    let cancelled = false
    setCatWallpaper(null)
    void loadCatWallpaper(preferences.wallpaperFilterMode, preferences.wallpaperPixelSize).then(value => { if (!cancelled) setCatWallpaper(value) })
    return () => { cancelled = true }
  }, [preferences.wallpaper, preferences.wallpaperFilterMode, preferences.wallpaperPixelSize])
  useEffect(() => {
    if (preferences.wallpaper === 'custom' && importedWallpaper === null) setPreferences(current => ({ ...current, wallpaper: 'classic' }))
  }, [importedWallpaper, preferences.wallpaper])
  useEffect(() => {
    const previous = previousBaseFontSize.current
    if (previous === preferences.baseFontSize) dispatch({ type: 'reflow', workArea })
    else {
      dispatch({ type: 'rescale-ui', ratio: preferences.baseFontSize / previous, oldMenuBarHeight: uiMetrics(previous).menuBarHeight, workArea })
      previousBaseFontSize.current = preferences.baseFontSize
    }
  }, [preferences.baseFontSize, workArea])
  useEffect(() => {
    if (productiveBoundsApplied.current) return
    productiveBoundsApplied.current = true
    const ratio = preferences.baseFontSize / 10
    const minimumWidth = Math.round(600 * ratio)
    const minimumHeight = Math.round(390 * ratio)
    for (const window of desktop.windows) {
      if (window.appId !== 'knowledge-desk' || (window.bounds.width >= minimumWidth && window.bounds.height >= minimumHeight)) continue
      dispatch({ type: 'resize', id: window.id, width: Math.max(window.bounds.width, minimumWidth), height: Math.max(window.bounds.height, minimumHeight), workArea })
    }
  }, [desktop.windows, preferences.baseFontSize, workArea])
  useEffect(() => { writeScrapbook(window.localStorage, cards) }, [cards])
  useEffect(() => { writeDesktopPersistence(window.localStorage, { version: 2, desktop, shortcuts, archivedAgents, trash, renderMarkdown }) }, [archivedAgents, desktop, renderMarkdown, shortcuts, trash])
  useEffect(() => {
    if (sessions.phase === 'pending') return
    const next = new Map<string, boolean>()
    for (const id of sessions.ids) {
      const row = sessions.byId[id]
      const key = String(id); const completed = row?.completed === true
      next.set(key, completed)
      if (completionBaseline.current && completed && previousCompleted.current.get(key) !== true && !archivedAgents.some(item => item.sessionId === key)) {
        const notice = { id: `done:${key}:${Date.now()}`, sessionId: key, title: row?.displayTitle ?? key }
        setNotices(current => [...current.filter(item => item.sessionId !== key), notice].slice(-3))
        window.setTimeout(() => { setNotices(current => current.filter(item => item.id !== notice.id)) }, 12000)
      }
    }
    previousCompleted.current = next; completionBaseline.current = true
  }, [archivedAgents, sessions.byId, sessions.ids, sessions.phase])
  useEffect(() => {
    setCurrentWorkspaceId(current => {
      if (current !== undefined && workspaces.items.some(item => String(item.workspaceId) === current)) return current
      const activeWorkspace = sessions.current === undefined ? undefined : workspaces.items.find(item => item.sessionIds.some(id => String(id) === String(sessions.current)))
      return activeWorkspace === undefined
        ? String(workspaces.items.find(item => item.workspaceId === workspaces.recentWorkspaceId)?.workspaceId ?? workspaces.items[0]?.workspaceId ?? '') || undefined
        : String(activeWorkspace.workspaceId)
    })
  }, [sessions.current, workspaces.items, workspaces.recentWorkspaceId])
  useEffect(() => {
    if (sessions.phase === 'pending' || initialWindowOpened.current) return
    initialWindowOpened.current = true
    dispatch({ type: 'open', appId: 'knowledge-desk', title: 'Knowledge Desk', payload: { browser: 'workspaces' }, workArea, baseFontSize: preferences.baseFontSize })
  }, [preferences.baseFontSize, sessions.phase, workArea])

  const open = useCallback((appId: AppId, title = appTitle(appId), payload?: Record<string, unknown>, bounds?: Bounds, resizable?: boolean) => {
    dispatch({ type: 'open', appId, title, workArea, baseFontSize: preferences.baseFontSize, ...(payload === undefined ? {} : { payload }), ...(bounds === undefined ? {} : { bounds }), ...(resizable === undefined ? {} : { resizable }) })
  }, [preferences.baseFontSize, workArea])
  const focusOrOpenAgent = useCallback((sessionId: string) => {
    const workspace = workspaces.items.find(item => item.sessionIds.some(id => String(id) === sessionId))
    if (workspace !== undefined) setCurrentWorkspaceId(String(workspace.workspaceId))
    const existing = desktop.windows.find(window => window.appId === 'knowledge-desk' && valueOf(window.payload, 'sessionId') === sessionId)
    if (existing !== undefined) { dispatch({ type: 'focus', id: existing.id }); adapter.openSession(sessionId); return }
    const summary = sessions.byId[sessionId as keyof typeof sessions.byId]
    adapter.openSession(sessionId); open('knowledge-desk', summary?.displayTitle ?? `Agent ${sessionId.slice(-8)}`, { sessionId })
  }, [adapter, desktop.windows, open, sessions.byId, workspaces.items])
  const chooseFolder = useCallback(async () => {
    const selected = await adapter.chooseWorkspace()
    if (selected !== null) {
      setCurrentWorkspaceId(String(selected.workspace.workspaceId))
      focusOrOpenAgent(selected.sessionId)
    }
  }, [adapter, focusOrOpenAgent])
  const openWorkspace = useCallback(async (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId)
    focusOrOpenAgent(await adapter.openWorkspace(workspaceId))
  }, [adapter, focusOrOpenAgent])
  const newAgent = useCallback(async (workspaceId?: string) => {
    const workspace = workspaces.items.find(item => String(item.workspaceId) === (workspaceId ?? currentWorkspaceId))
    if (workspace === undefined) { await chooseFolder(); return }
    await openWorkspace(String(workspace.workspaceId))
  }, [chooseFolder, currentWorkspaceId, openWorkspace, workspaces.items])
  const openAgentBrowser = useCallback(() => {
    const existing = desktop.windows.find(window => window.appId === 'knowledge-desk' && valueOf(window.payload, 'sessionId') === undefined)
    if (existing !== undefined) dispatch({ type: 'focus', id: existing.id })
    else open('knowledge-desk', 'Knowledge Desk', { browser: 'agents' })
  }, [desktop.windows, open])
  const openFinder = useCallback((sessionId?: string, path?: string) => {
    const id = sessionId ?? currentWorkspace?.sessionIds.map(String).find(candidate => sessions.byId[candidate as keyof typeof sessions.byId] !== undefined) ?? (sessions.current === undefined ? undefined : String(sessions.current))
    if (id === undefined) { openAgentBrowser(); return }
    open('finder', path === undefined ? 'Finder' : pathBasename(path), { sessionId: id, ...(path === undefined ? {} : { path }) })
  }, [currentWorkspace?.sessionIds, open, openAgentBrowser, sessions.byId, sessions.current])
  const openTerminal = useCallback((sessionId: string, cwd?: string) => { open('terminal', `Terminal — ${cwd === undefined ? sessionId.slice(0, 8) : pathBasename(cwd)}`, { sessionId, ...(cwd === undefined ? {} : { cwd }) }) }, [open])
  const openTerminalForSession = useCallback(async (id: string, cwd?: string) => {
    try {
      const workspace = workspaces.items.find(item => item.sessionIds.some(sessionId => String(sessionId) === id) || item.path === cwd)
      const terminalCwd = cwd ?? workspace?.path
      const terminalSessionId = await adapter.ensureTerminalOwner({ preferredSessionId: id, ...(workspace === undefined ? {} : { workspaceId: String(workspace.workspaceId) }), ...(terminalCwd === undefined ? {} : { cwd: terminalCwd }) })
      openTerminal(terminalSessionId, terminalCwd)
    } catch (reason) {
      setOperationError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [adapter, openTerminal, workspaces.items])
  const openTimeline = useCallback((sessionId: string) => { open('timeline', `Timeline — ${sessions.byId[sessionId as keyof typeof sessions.byId]?.displayTitle ?? sessionId.slice(0, 8)}`, { sessionId }) }, [open, sessions.byId])
  const openTerminalForCurrent = useCallback(async () => {
    const fromActive = valueOf(active?.payload, 'sessionId')
    const id = fromActive ?? (sessions.current === undefined ? undefined : String(sessions.current))
    if (id !== undefined) {
      const cwd = sessions.byId[id as keyof typeof sessions.byId]?.cwd
      await openTerminalForSession(id, cwd)
      return
    }
    try {
      const workspace = workspaces.items.find(item => item.workspaceId === workspaces.recentWorkspaceId) ?? workspaces.items[0]
      if (workspace !== undefined) {
        const terminalSessionId = await adapter.ensureTerminalOwner({ workspaceId: String(workspace.workspaceId), cwd: workspace.path })
        openTerminal(terminalSessionId, workspace.path)
        return
      }
      const selected = await adapter.chooseWorkspace()
      if (selected !== null) openTerminal(selected.sessionId, selected.path)
    } catch (reason) {
      setOperationError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [active?.payload, adapter, openTerminal, openTerminalForSession, sessions.byId, sessions.current, workspaces.items, workspaces.recentWorkspaceId])
  const openFile = useCallback((sessionId: string, path: string) => {
    const extension = pathExtension(path)
    if (extension === 'pdf' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) open('preview', pathBasename(path), { sessionId, path })
    else open('textedit', pathBasename(path), { sessionId, path })
  }, [open])
  const addScrap = useCallback((input: { title: string; kind: 'text' | 'code' | 'reference'; body: string; sessionId: string; eventId?: string }) => {
    const time = Date.now()
    setCards(current => [...current, { id: `card-${time}-${Math.random().toString(16).slice(2)}`, title: input.title, kind: input.kind, body: input.body, source: { sessionId: input.sessionId, ...(input.eventId === undefined ? {} : { eventId: input.eventId }) }, createdAt: time, updatedAt: time }])
    const existing = desktop.windows.find(window => window.appId === 'scrapbook')
    if (existing !== undefined) dispatch({ type: 'focus', id: existing.id })
  }, [desktop.windows])
  const requestClose = useCallback((id: string) => {
    if (dirty.current.get(id) === true) setPendingClose(id)
    else { dirty.current.delete(id); dispatch({ type: 'close', id }) }
  }, [])
  const openAccessory = useCallback((appId: 'scrapbook' | 'clock' | 'puzzle' | 'monitor' | 'control-panel') => {
    const existing = desktop.windows.find(window => window.appId === appId)
    if (existing !== undefined) dispatch({ type: 'focus', id: existing.id })
    else {
      const ratio = preferences.baseFontSize / 10
      const clockWidth = Math.round(154 * ratio)
      const clockHeight = Math.round(112 * ratio)
      open(appId, appTitle(appId), undefined, appId === 'clock' ? { x: desktopSize.width - clockWidth - Math.round(21 * ratio), y: metrics.menuBarHeight + Math.round(20 * ratio), width: clockWidth, height: clockHeight } : undefined, appId !== 'clock')
    }
  }, [desktop.windows, desktopSize.width, metrics.menuBarHeight, open, preferences.baseFontSize])
  const openTrash = useCallback(() => {
    const existing = desktop.windows.find(window => window.appId === 'trash')
    if (existing !== undefined) dispatch({ type: 'focus', id: existing.id })
    else open('trash', 'Trash')
  }, [desktop.windows, open])

  const upstreamArchivedIds = workspaces.archivedSessionIds.map(id => String(id))
  const upstreamArchivedSet = new Set(upstreamArchivedIds)
  const localArchivedSet = new Set(archivedAgents.map(item => item.sessionId))
  const allSessionRows = sessions.ids.filter(id => !upstreamArchivedSet.has(String(id))).map(id => {
    const sessionId = String(id)
    const cwd = sessions.byId[id]?.cwd
    const workspace = workspaces.items.find(item => item.sessionIds.some(candidate => String(candidate) === sessionId)) ?? (cwd === undefined ? undefined : workspaces.items.find(item => cwd === item.path || cwd.startsWith(`${item.path.replace(/[\\/]+$/, '')}/`)))
    return { id: sessionId, title: sessions.byId[id]?.displayTitle ?? sessionId, running: sessions.byId[id]?.running ?? false, completed: sessions.byId[id]?.completed ?? false, updatedAt: sessions.byId[id]?.updatedAt ?? 0, ...(cwd === undefined ? {} : { cwd }), ...(workspace === undefined ? {} : { workspaceId: String(workspace.workspaceId), workspaceTitle: workspace.title }) }
  })
  const sessionRows = allSessionRows.filter(row => !localArchivedSet.has(row.id))
  const workspaceRows = workspaces.items.map(item => ({ id: String(item.workspaceId), title: item.title, path: item.path, sessionIds: item.sessionIds.map(id => String(id)) }))
  const archiveSession = async (sessionId: string) => {
    const row = allSessionRows.find(item => item.id === sessionId)
    if (row === undefined) throw new Error('This Agent is no longer present in the DSH session list.')
    setArchivedAgents(current => current.some(item => item.sessionId === sessionId) ? current : [...current, { sessionId, title: row.title, ...(row.cwd === undefined ? {} : { cwd: row.cwd }), archivedAt: Date.now() }])
    if (String(sessions.current) === sessionId) adapter.clearSessionSelection()
    dispatch({ type: 'close-session', sessionId })
  }
  const restoreSession = (sessionId: string) => { setArchivedAgents(current => current.filter(item => item.sessionId !== sessionId)) }
  const renameSession = async (sessionId: string, title: string) => {
    const accepted = await adapter.renameSession(sessionId, title)
    setArchivedAgents(current => current.map(item => item.sessionId === sessionId ? { ...item, title: accepted } : item))
    setShortcuts(current => current.map(item => item.kind === 'agent' && item.sessionId === sessionId ? { ...item, label: accepted } : item))
    for (const window of desktop.windows) if (valueOf(window.payload, 'sessionId') === sessionId && window.appId === 'knowledge-desk') dispatch({ type: 'retitle', id: window.id, title: accepted })
  }
  const exportSession = async (sessionId: string, format: 'markdown' | 'json', title: string) => { downloadExport(await adapter.exportSession(sessionId, format, title)) }
  const createHandoff = async (sessionId: string, summary: string) => {
    const source = allSessionRows.find(item => item.id === sessionId)
    const nextId = await adapter.newSession(source?.cwd)
    focusOrOpenAgent(nextId)
    await adapter.prompt(nextId, `Handoff from “${source?.title ?? sessionId}”. Treat the following as working context, preserve its constraints, and continue from it when I send the next task.\n\n${summary}`, 'queue')
  }
  const monitorTasks: MonitorTaskView[] = sessions.ids.flatMap(id => (sessions.jobsBySession[id] ?? []).map(job => ({
    id: String(job.id), sessionId: String(id), agentTitle: sessions.byId[id]?.displayTitle ?? String(id), kind: job.kind, label: job.label, status: job.status, ...(job.detail === undefined ? {} : { detail: job.detail }), startedAt: job.startedAt, ...(job.finishedAt === undefined ? {} : { finishedAt: job.finishedAt }),
  }))).sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt))
  const findTargets = workspaceRows.flatMap(workspace => {
    const sessionId = workspace.sessionIds.find(id => sessions.byId[id as keyof typeof sessions.byId] !== undefined)
    return sessionId === undefined ? [] : [{ id: workspace.id, sessionId, label: workspace.title }]
  })
  const installImportedWallpaper = (wallpaper: ImportedWallpaper): boolean => {
    const next: ImportedWallpaperLibrary = { version: 4, selectedId: wallpaper.id, items: [...wallpaperLibrary.items, wallpaper] }
    if (!writeImportedWallpapers(window.localStorage, next)) return false
    setWallpaperLibrary(next)
    return true
  }
  const selectImportedWallpaper = (id: string): boolean => {
    if (!wallpaperLibrary.items.some(item => item.id === id)) return false
    const next: ImportedWallpaperLibrary = { ...wallpaperLibrary, selectedId: id }
    if (!writeImportedWallpapers(window.localStorage, next)) return false
    setWallpaperLibrary(next)
    return true
  }
  const removeImportedWallpaper = (id: string): boolean => {
    const items = wallpaperLibrary.items.filter(item => item.id !== id)
    const selectedId = wallpaperLibrary.selectedId === id ? items.at(-1)?.id ?? null : wallpaperLibrary.selectedId
    const next: ImportedWallpaperLibrary = { version: 4, selectedId, items }
    if (!writeImportedWallpapers(window.localStorage, next)) return false
    setWallpaperLibrary(next)
    return true
  }

  const defaultShortcutPosition = () => {
    const index = shortcuts.length
    const columns = Math.max(1, Math.floor((desktopSize.width - 30) / 82))
    return { x: 16 + (index % columns) * 82, y: metrics.menuBarHeight + 16 + Math.floor(index / columns) * 72 }
  }
  const shortcutPositionBounds = { x: 4, y: metrics.menuBarHeight + 4, width: Math.max(1, desktopSize.width - 72 - 4 + 1), height: Math.max(1, desktopSize.height - 62 - (metrics.menuBarHeight + 4) + 1) }
  const putDesktopItem = (item: S7RDragItem, position = defaultShortcutPosition()) => {
    const next = shortcutFromDrag(item, Math.max(4, Math.min(desktopSize.width - 72, position.x)), Math.max(metrics.menuBarHeight + 4, Math.min(desktopSize.height - 62, position.y)))
    setShortcuts(current => [...current.filter(existing => existing.id !== next.id), next])
    setTrash(current => current.filter(record => record.shortcut.id !== next.id))
    setSelectedShortcutIds([next.id])
  }
  const moveToTrash = (ids: readonly string[]) => {
    const selected = new Set(ids)
    const records = shortcuts.filter(shortcut => selected.has(shortcut.id)).map(shortcut => ({ shortcut, trashedAt: Date.now() }))
    if (records.length === 0) return
    setTrash(current => [...current.filter(record => !selected.has(record.shortcut.id)), ...records])
    setShortcuts(current => current.filter(shortcut => !selected.has(shortcut.id)))
    setSelectedShortcutIds([])
  }
  const restoreFromTrash = (ids: string[]) => {
    const selected = new Set(ids)
    const restoredItems = trash.filter(record => selected.has(record.shortcut.id)).map(record => ({ ...record.shortcut, x: Math.max(4, Math.min(desktopSize.width - 72, record.shortcut.x)), y: Math.max(metrics.menuBarHeight + 4, Math.min(desktopSize.height - 62, record.shortcut.y)) }))
    if (restoredItems.length === 0) return
    setShortcuts(current => [...current.filter(shortcut => !selected.has(shortcut.id)), ...restoredItems])
    setTrash(current => current.filter(record => !selected.has(record.shortcut.id)))
    setSelectedShortcutIds(restoredItems.map(item => item.id))
  }
  const cleanUpDesktop = () => {
    const columns = Math.max(1, Math.floor((desktopSize.width - 96) / 82))
    setShortcuts(current => current.map((shortcut, index) => ({ ...shortcut, x: 16 + (index % columns) * 82, y: metrics.menuBarHeight + 16 + Math.floor(index / columns) * 72 })))
  }
  const openDesktopShortcut = (item: DesktopShortcut) => {
    if (item.kind === 'workspace') { void openWorkspace(item.workspaceId); return }
    if (item.kind === 'agent') { if (localArchivedSet.has(item.sessionId)) restoreSession(item.sessionId); focusOrOpenAgent(item.sessionId); return }
    if (item.kind === 'scrapbook') { open('scrapbook', item.label, { cardId: item.cardId }); return }
    if (item.pathType === 'file') { openFile(item.sessionId, item.path); return }
    if (item.folderAction === 'workspace') {
      void adapter.connectWorkspacePath(item.path).then(focusOrOpenAgent, reason => { setOperationError(reason instanceof Error ? reason.message : String(reason)) })
    } else openFinder(item.sessionId, item.path)
  }
  const dropOnDesktop = (event: React.DragEvent<HTMLElement>) => {
    const item = readDragItem(event.dataTransfer)
    if (item === null) return
    event.preventDefault()
    const position = { x: Math.round((event.clientX - frameLeft) / preferences.pixelScale) - 28, y: Math.round((event.clientY - frameTop) / preferences.pixelScale) - 18 }
    if (item.shortcutId !== undefined && shortcuts.some(shortcut => shortcut.id === item.shortcutId)) {
      const movingIds = item.shortcutIds?.filter(id => shortcuts.some(shortcut => shortcut.id === id)) ?? [item.shortcutId]
      setShortcuts(current => moveShortcutGroup(current, item.shortcutId!, movingIds, Math.max(4, Math.min(desktopSize.width - 72, position.x)), Math.max(metrics.menuBarHeight + 4, Math.min(desktopSize.height - 62, position.y)), shortcutPositionBounds))
      setSelectedShortcutIds(movingIds)
      return
    }
    if (item.kind === 'path' && item.pathType === 'directory' && item.folderAction === undefined) { setPendingFolderShortcut({ item, ...position }); return }
    putDesktopItem(item, position)
  }
  const dropOnTrash = (event: React.DragEvent<HTMLElement>) => {
    const item = readDragItem(event.dataTransfer)
    if (item?.shortcutId === undefined) return
    const ids = item.shortcutIds?.filter(id => shortcuts.some(shortcut => shortcut.id === id)) ?? [item.shortcutId]
    event.preventDefault(); event.stopPropagation()
    moveToTrash(ids)
  }

  const contentFor = (window: DesktopWindowState) => {
    const sessionId = valueOf(window.payload, 'sessionId') ?? (sessions.current === undefined ? undefined : String(sessions.current))
    const path = valueOf(window.payload, 'path')
    switch (window.appId) {
      case 'knowledge-desk': return <KnowledgeDeskApp adapter={adapter} sessionId={valueOf(window.payload, 'sessionId')} sessions={sessionRows} workspaces={workspaceRows} currentWorkspaceId={currentWorkspaceId} archivedAgents={archivedAgents} upstreamArchivedIds={upstreamArchivedIds} preferences={preferences} renderMarkdown={renderMarkdown} onRenderMarkdownChange={setRenderMarkdown} onOpenSession={focusOrOpenAgent} onArchiveSession={archiveSession} onRestoreSession={restoreSession} onRenameSession={renameSession} onExportSession={exportSession} onCreateHandoff={createHandoff} onAddDesktopItem={putDesktopItem} onNewSession={newAgent} onChooseFolder={chooseFolder} onOpenWorkspace={openWorkspace} onSelectWorkspace={setCurrentWorkspaceId} onOpenSettings={() => { open('settings', 'Settings') }} onOpenTimeline={openTimeline} onOpenFile={openFile} onAddScrap={addScrap} />
      case 'finder': return <FinderApp adapter={adapter} sessionId={sessionId} initialPath={valueOf(window.payload, 'path')} onOpenFile={openFile} onOpenTerminal={(id, cwd) => { void openTerminalForSession(id, cwd) }} />
      case 'textedit': return sessionId === undefined || path === undefined ? <div className="kd-empty">No text document was supplied.</div> : <TextEditApp adapter={adapter} sessionId={sessionId} path={path} active={desktop.activeId === window.id} windowId={window.id} onDirtyChange={(id, isDirty) => { dirty.current.set(id, isDirty) }} onTitleChange={title => { dispatch({ type: 'retitle', id: window.id, title }) }} onRunInTerminal={(id, file) => { void openTerminalForSession(id, parentDirectory(file)) }} />
      case 'preview': return sessionId === undefined || path === undefined ? <div className="kd-empty">No preview document was supplied.</div> : <PreviewApp adapter={adapter} sessionId={sessionId} path={path} preferences={preferences} />
      case 'terminal': return sessionId === undefined ? <div className="kd-empty">A live agent session is required for a terminal.</div> : <TerminalApp adapter={adapter} sessionId={sessionId} cwd={valueOf(window.payload, 'cwd')} />
      case 'timeline': return sessionId === undefined ? <div className="kd-empty">Choose an agent to inspect its timeline.</div> : <TimelineApp adapter={adapter} sessionId={sessionId} onOpenAgent={focusOrOpenAgent} onOpenFile={openFile} />
      case 'monitor': return <MonitorApp adapter={adapter} tasks={monitorTasks} onOpenAgent={focusOrOpenAgent} />
      case 'settings': return <SettingsApp adapter={adapter} />
      case 'control-panel': return <DisplayControlPanel preferences={preferences} importedWallpapers={wallpaperLibrary.items} selectedWallpaperId={wallpaperLibrary.selectedId} onChange={setPreferences} onImportWallpaper={installImportedWallpaper} onSelectWallpaper={selectImportedWallpaper} onRemoveWallpaper={removeImportedWallpaper} />
      case 'clock': return <ClockApp />
      case 'puzzle': return <PuzzleApp />
      case 'scrapbook': { const cardId = valueOf(window.payload, 'cardId'); return <ScrapbookApp cards={cards} {...(cardId === undefined ? {} : { initialCardId: cardId })} onChange={setCards} onPutDesktop={card => { putDesktopItem({ kind: 'scrapbook', label: card.title, cardId: card.id }) }} onOpenSource={card => { const id = card.source?.sessionId; const file = card.source?.filePath; if (id !== undefined && file !== undefined) openFile(id, file); else if (id !== undefined) focusOrOpenAgent(id) }} /> }
      case 'find': return <FindApp adapter={adapter} workspaces={findTargets} sessionIds={[...new Set([...allSessionRows.map(row => row.id), ...archivedAgents.map(row => row.sessionId)])]} agentTitles={Object.fromEntries([...allSessionRows.map(row => [row.id, row.title]), ...archivedAgents.map(row => [row.sessionId, row.title])])} {...(sessions.current === undefined ? {} : { currentSessionId: String(sessions.current) })} onOpenFile={openFile} onOpenFolder={(id, folder) => { openFinder(id, folder) }} onOpenAgent={focusOrOpenAgent} onOpenTimeline={openTimeline} />
      case 'trash': return <TrashApp records={trash} onRestore={restoreFromTrash} onEmpty={() => { setTrash([]) }} />
    }
  }

  return <div className="knowledge-desk-host">
    <AppStylesBridge /><AccessoriesStylesBridge />
    <div className="kd-stage"><div className="kd-frame-stack" style={{ width: visualWidth, height: visualHeight, left: frameLeft, top: frameTop }}><main className="kd-desktop" tabIndex={-1}
      onPointerDown={event => {
        if (event.target !== event.currentTarget || event.button !== 0) return
        const startX = Math.round((event.clientX - frameLeft) / preferences.pixelScale)
        const startY = Math.round((event.clientY - frameTop) / preferences.pixelScale)
        const baseline = event.metaKey || event.shiftKey ? [...selectedShortcutIds] : []
        event.currentTarget.setPointerCapture(event.pointerId)
        setSelectedShortcutIds(baseline)
        setMarquee({ pointerId: event.pointerId, startX, startY, baseline, x: startX, y: startY, width: 0, height: 0 })
      }}
      onPointerMove={event => {
        if (marquee === null || marquee.pointerId !== event.pointerId) return
        const endX = Math.round((event.clientX - frameLeft) / preferences.pixelScale)
        const endY = Math.round((event.clientY - frameTop) / preferences.pixelScale)
        const rect = normalizedSelectionRect(marquee.startX, marquee.startY, endX, endY)
        const inside = shortcutsInRect(shortcuts, rect, preferences.baseFontSize * 7, preferences.baseFontSize * 5.2)
        setMarquee({ ...marquee, ...rect })
        setSelectedShortcutIds([...new Set([...marquee.baseline, ...inside])])
      }}
      onPointerUp={event => { if (marquee?.pointerId === event.pointerId) { setMarquee(null); event.currentTarget.releasePointerCapture(event.pointerId) } }}
      onKeyDown={event => { const target = event.target as HTMLElement; if ((event.key === 'Delete' || event.key === 'Backspace') && selectedShortcutIds.length > 0 && !target.matches('input,textarea,[contenteditable="true"]')) { event.preventDefault(); moveToTrash(selectedShortcutIds) } }}
      onDragOver={event => { if (event.dataTransfer.types.includes('application/x-s7r-desktop-item')) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }} onDrop={dropOnDesktop} style={{ width: desktopSize.width, height: desktopSize.height, zoom: preferences.pixelScale, ...wallpaperStyle }} data-resolution={preferences.resolution} data-base-font={preferences.baseFontSize} data-pixel-scale={preferences.pixelScale}>
      <MenuBar active={active} windows={desktop.windows} clock={now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} agents={sessionRows.map(row => ({ id: row.id, title: row.title, status: row.running ? 'running' : row.completed ? 'completed' : 'idle', updatedAt: row.updatedAt }))}
        onAccessory={openAccessory} onSettings={() => { open('settings', 'Settings') }} onNewAgent={() => { void newAgent().catch(reason => { setOperationError(reason instanceof Error ? reason.message : String(reason)) }) }} onChooseFolder={() => { void chooseFolder().catch(reason => { setOperationError(reason instanceof Error ? reason.message : String(reason)) }) }} onOpenAgents={openAgentBrowser} onOpenFinder={() => { openFinder() }} onOpenTerminal={() => { void openTerminalForCurrent() }} onFind={() => { open('find', 'Find') }} onClose={() => { if (active !== undefined) requestClose(active.id) }} onSave={() => { window.dispatchEvent(new Event('knowledge-desk:save-active')) }}
        onZoom={() => { if (active !== undefined) dispatch({ type: 'zoom', id: active.id, workArea }) }} onCollapse={() => { if (active !== undefined) dispatch({ type: 'collapse', id: active.id }) }} onTile={() => { dispatch({ type: 'tile', workArea }) }} onRestoreLayout={() => { dispatch({ type: 'restore-layout', workArea }) }} hasRestorableLayout={desktop.layoutRestore !== undefined} trashCount={trash.length} onOpenTrash={openTrash} onEmptyTrash={() => { setConfirmEmptyTrash(true) }} onCleanUpDesktop={cleanUpDesktop} onFocusWindow={id => { dispatch({ type: 'focus', id }) }} onTimeline={() => { const id = valueOf(active?.payload, 'sessionId'); if (id !== undefined) openTimeline(id) }} onFocusAgent={focusOrOpenAgent} onStopAgent={id => { void adapter.cancel(id).catch(reason => { setOperationError(reason instanceof Error ? reason.message : String(reason)) }) }} onHelp={() => { setHelp(true) }} onAbout={() => { setAbout(true) }} />
      <div className="kd-desktop-items" aria-label="Desktop items">{shortcuts.map(item => <button key={item.id} draggable className="kd-desktop-item" data-selected={selectedShortcutIds.includes(item.id) || undefined} style={{ left: item.x, top: item.y }} title={item.kind === 'path' && item.pathType === 'directory' ? item.folderAction === 'workspace' ? `${item.path} · use as Workspace` : `${item.path} · browse in Finder` : item.kind === 'workspace' ? item.path : item.label}
        onPointerDown={event => { event.stopPropagation(); if (event.metaKey || event.shiftKey) setSelectedShortcutIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); else if (!selectedShortcutIds.includes(item.id)) setSelectedShortcutIds([item.id]) }}
        onDragStart={event => { writeDragItem(event.dataTransfer, dragItemOf(item, selectedShortcutIds.includes(item.id) ? selectedShortcutIds : [item.id])) }} onClick={event => { event.stopPropagation() }} onDoubleClick={() => { openDesktopShortcut(item) }}><AppIcon app={item.kind === 'workspace' ? 'folder' : item.kind === 'agent' ? 'knowledge-desk' : item.kind === 'scrapbook' ? 'scrapbook' : item.pathType === 'directory' ? 'folder' : 'file'} /><span>{item.label}</span>{item.kind === 'path' && item.pathType === 'directory' ? <small>{item.folderAction === 'workspace' ? 'WORKSPACE' : 'FINDER'}</small> : null}</button>)}</div>
      {marquee === null ? null : <div className="kd-selection-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}
      <button className="kd-trash-icon" data-full={trash.length > 0 || undefined} title={trash.length === 0 ? 'Trash is empty' : `${trash.length} desktop aliases in Trash`} onDragOver={event => { if (event.dataTransfer.types.includes('application/x-s7r-desktop-item')) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move' } }} onDrop={dropOnTrash} onDoubleClick={openTrash}><AppIcon app="trash" /><span>Trash</span></button>
      <div className="kd-desk-mark" aria-hidden="true"><span>S7R</span><small><span>{desktopSize.width} × {desktopSize.height}</span><span>{preferences.pixelScale}× · {preferences.baseFontSize}px</span></small></div>
      <div className="kd-notifications" aria-live="polite">{notices.map(notice => <button key={notice.id} onClick={() => { setNotices(current => current.filter(item => item.id !== notice.id)); focusOrOpenAgent(notice.sessionId) }}><strong>Agent finished</strong><span>{notice.title}</span></button>)}</div>
      {desktop.windows.map(window => <SystemWindow key={window.id} window={window} active={desktop.activeId === window.id} baseFontSize={preferences.baseFontSize} pixelScale={preferences.pixelScale} onFocus={() => { dispatch({ type: 'focus', id: window.id }) }} onClose={() => { requestClose(window.id) }} onMove={(x, y) => { dispatch({ type: 'move', id: window.id, x, y, workArea }) }} onResize={(width, height) => { dispatch({ type: 'resize', id: window.id, width, height, workArea }) }} onZoom={() => { dispatch({ type: 'zoom', id: window.id, workArea }) }} onCollapse={() => { dispatch({ type: 'collapse', id: window.id }) }}>{contentFor(window)}</SystemWindow>)}
      {pendingClose === null ? null : <SystemDialog title="Unsaved Changes" onClose={() => { setPendingClose(null) }}><p>This document has changes that have not been saved.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setPendingClose(null) }}>Cancel</SystemButton><SystemButton onClick={() => { const id = pendingClose; setPendingClose(null); dirty.current.delete(id); dispatch({ type: 'close', id }) }}>Discard Changes</SystemButton></div></SystemDialog>}
      {pendingFolderShortcut === null ? null : <SystemDialog title="Folder Shortcut" onClose={() => { setPendingFolderShortcut(null) }}><p>How should “{pendingFolderShortcut.item.label}” behave on the desktop?</p><p className="kd-muted"><strong>Finder Alias</strong> opens this directory inside its existing Workspace. <strong>Workspace Alias</strong> registers this directory as a Workspace and connects an Agent.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setPendingFolderShortcut(null) }}>Cancel</SystemButton><SystemButton onClick={() => { const pending = pendingFolderShortcut; putDesktopItem({ ...pending.item, folderAction: 'browse' }, pending); setPendingFolderShortcut(null) }}>Finder Alias</SystemButton><SystemButton onClick={() => { const pending = pendingFolderShortcut; putDesktopItem({ ...pending.item, folderAction: 'workspace' }, pending); setPendingFolderShortcut(null) }}>Workspace Alias</SystemButton></div></SystemDialog>}
      {confirmEmptyTrash ? <SystemDialog title="Empty Trash" onClose={() => { setConfirmEmptyTrash(false) }}><p>Permanently remove {trash.length} S7R desktop {trash.length === 1 ? 'alias' : 'aliases'} from Trash?</p><p className="kd-muted">No real file, folder, Workspace, Agent history, or Scrapbook card will be deleted.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setConfirmEmptyTrash(false) }}>Cancel</SystemButton><SystemButton onClick={() => { setTrash([]); setConfirmEmptyTrash(false) }}>Empty Trash</SystemButton></div></SystemDialog> : null}
      {help ? <SystemDialog title="S7R Guide" onClose={() => { setHelp(false) }}><div className="kd-help-guide"><p>S7R puts DSH inside a compact System 7-style desktop.</p><ol><li>Start with <strong>File → Choose Folder…</strong>. Knowledge Desk then reopens Workspaces and Agents; its Archived tab restores S7R-archived conversations.</li><li>Use <strong>File → Find…</strong> to search file names, source contents, Agent messages, or every event stream.</li><li>Drag Workspaces, Agents, Finder items, or one Scrapbook card onto the desktop. Drag empty desktop space to marquee-select several aliases, then drag one selected alias to move the group.</li><li>Delete selected aliases or drag them to the bottom-right <strong>Trash</strong>. Open Trash to Put Away items; use <strong>Special → Empty Trash…</strong> for permanent removal of aliases. Real project files are never deleted.</li><li>Drop a path into an Agent: paths inside its project become relative; paths outside stay absolute. Use <strong>Context</strong> for context management and <strong>Other…</strong> for rename, export, archive, desktop placement, and Markdown rendering.</li><li>Double-click Finder items to open them. Save TextEdit documents with <strong>File → Save</strong>; <strong>File → New Terminal</strong> starts zsh. Monitor’s Background tab shows DSH jobs.</li><li>Use <strong>S7R → Settings…</strong> for the DeepSeek API key and <strong>Display Control Panel</strong> for scale, filters, and wallpaper.</li><li>Use <strong>Window</strong> to focus, tile, zoom, or collapse windows.</li></ol><p className="kd-muted">Window positions, desktop items, Trash, and the Markdown preference return after reload. Live Terminal windows intentionally do not, because their PTYs cannot be safely reattached. Browser-owned shortcuts may control the browser tab, so use S7R’s menus for reliable commands.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setHelp(false) }}>OK</SystemButton></div></div></SystemDialog> : null}
      {about ? <SystemDialog title="About S7R" onClose={() => { setAbout(false) }}><div className="kd-about"><div className="kd-welcome-mark">S7R</div><h2>S7R</h2><p>System 7 Reimagined — a workstation shell for DeepSeek Harness.</p><p className="kd-small">Original implementation. No Apple assets are included.</p><SystemButton onClick={() => { setAbout(false) }}>OK</SystemButton></div></SystemDialog> : null}
      {operationError === null ? null : <SystemDialog title="S7R" onClose={() => { setOperationError(null) }}><p>{operationError}</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setOperationError(null) }}>OK</SystemButton></div></SystemDialog>}
    </main></div></div>
    <div className="kd-desktop-notice"><div className="s7-dialog"><div className="s7-dialog-title">Display Too Small</div><div className="s7-dialog-body">S7R needs a larger viewport for safe interaction.</div></div></div>
  </div>
}
