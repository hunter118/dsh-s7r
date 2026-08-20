import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgentActivityView, SystemUsageView, TimelineEventView } from '../../dsh-compat/protocol.ts'
import type { DshClientAdapter } from '../../dsh-compat/client.ts'
import { RESOLUTION_PRESETS, UI_SIZE_PRESETS } from '../../desktop/resolution.ts'
import type { DisplayPreferences } from '../../display/preferences.ts'
import { importWallpaperFile } from '../../display/wallpaper.ts'
import type { ScrapbookCard } from '../../storage/scrapbook.ts'
import type { ImportedWallpaper } from '../../storage/wallpaper.ts'
import type { AgentMenuLimit, TrashedShortcutRecord } from '../../storage/desktop.ts'
import { AppIcon, SystemButton, SystemCheckbox, SystemDialog, SystemInput, SystemPanel, SystemRadio, SystemSelect, SystemStatusBar, SystemTextArea } from '../../system7/primitives.tsx'
import { errorMessage, formatBytes, formatContextUsage, formatTime, pathBasename } from '../common.tsx'
import { groupConsecutiveTimelineEvents } from './timeline-groups.ts'
import { movePuzzleTile, puzzleSolved, shufflePuzzle, SOLVED_PUZZLE } from './puzzle.ts'

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(text)
    return
  }
  const temporary = document.createElement('textarea')
  temporary.value = text
  temporary.setAttribute('readonly', '')
  temporary.style.position = 'fixed'
  temporary.style.left = '-9999px'
  document.body.append(temporary)
  temporary.select()
  const copied = document.execCommand('copy')
  temporary.remove()
  if (!copied) throw new Error('Browser clipboard access is unavailable.')
}

export function TimelineApp({ adapter, sessionId, onOpenAgent, onOpenFile }: {
  adapter: DshClientAdapter
  sessionId: string
  onOpenAgent: (sessionId: string) => void
  onOpenFile: (sessionId: string, path: string) => void
}) {
  const [events, setEvents] = useState<TimelineEventView[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let cancelled = false
    const load = () => { void adapter.rpc<TimelineEventView[]>('timeline/list', { sessionId }).then(value => { if (!cancelled) { setEvents(value); setError(null) } }, reason => { if (!cancelled) setError(errorMessage(reason)) }) }
    load()
    const timer = window.setInterval(load, 2000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [adapter, sessionId, refresh])
  const groups = useMemo(() => groupConsecutiveTimelineEvents(events), [events])
  const possibleFile = (event: TimelineEventView): string | undefined => {
    const raw = JSON.stringify(event.data)
    return /(?:"|\s)((?:\/|\.\/)[^"\n]+\.(?:txt|md|json|ts|tsx|js|py|pdf|png|jpe?g|gif|webp|svg))(?:"|\s)/i.exec(raw)?.[1]
  }
  return <>
    <div className="kd-toolbar"><SystemButton onClick={() => { setRefresh(value => value + 1) }}>Refresh</SystemButton><SystemButton onClick={() => { onOpenAgent(sessionId) }}>Focus Agent</SystemButton><span className="kd-spacer" /><span>Complete available session log</span></div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <ol className="kd-timeline kd-scroll">{groups.map(group => {
      const first = group.events[0]!
      const last = group.events.at(-1)!
      const isExpanded = expanded === group.key
      return <li key={group.key} className="kd-timeline-event">
        <button className="kd-timeline-head" onClick={() => { setExpanded(current => current === group.key ? null : group.key) }}><time>{formatTime(first.time)}{first !== last ? `–${formatTime(last.time)}` : ''}</time><span className="kd-badge">{group.type}{group.events.length > 1 ? ` ×${group.events.length}` : ''}</span><span>#{first.seq}{first !== last ? `–${last.seq}` : ''}</span><span className="kd-spacer" /><span>{isExpanded ? '▾' : '▸'}</span></button>
        {isExpanded ? <div className="kd-timeline-detail">{group.events.map(event => {
          const file = possibleFile(event)
          return <section className="kd-timeline-group-event" key={event.seq}><header><strong>#{event.seq}</strong><time>{formatTime(event.time)}</time></header><pre>{JSON.stringify(event.data, null, 2)}</pre><div><SystemButton onClick={() => { onOpenAgent(sessionId) }}>Open Agent</SystemButton>{file === undefined ? null : <SystemButton onClick={() => { onOpenFile(sessionId, file) }}>Open {pathBasename(file)}</SystemButton>}</div></section>
        })}</div> : null}
      </li>
    })}</ol>
    <SystemStatusBar>{events.length} chronological events · {groups.length} folded rows · Session {sessionId}</SystemStatusBar>
  </>
}

export interface MonitorTaskView { id: string; sessionId: string; agentTitle: string; kind: string; label: string; status: 'running' | 'stopping' | 'completed' | 'killed' | 'failed'; detail?: string; startedAt: number; finishedAt?: number }

export function MonitorApp({ adapter, tasks, onOpenAgent }: { adapter: DshClientAdapter; tasks: readonly MonitorTaskView[]; onOpenAgent: (sessionId: string) => void }) {
  const [agents, setAgents] = useState<AgentActivityView[]>([])
  const [system, setSystem] = useState<SystemUsageView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'agents' | 'tasks'>('agents')
  useEffect(() => {
    let cancelled = false
    const load = () => { void Promise.all([adapter.rpc<AgentActivityView[]>('agents/list'), adapter.rpc<SystemUsageView>('system/usage')]).then(([nextAgents, nextSystem]) => { if (!cancelled) { setAgents(nextAgents); setSystem(nextSystem); setError(null) } }, reason => { if (!cancelled) setError(errorMessage(reason)) }) }
    load()
    const timer = window.setInterval(load, 1500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [adapter])
  return <>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <div className="kd-monitor-system"><section><strong>CPU</strong><span>{system?.cpuPercent === undefined ? 'sampling…' : `${system.cpuPercent.toFixed(0)}% · ${system.cpuCount} cores`}</span><span className="kd-resource-meter"><i style={{ width: `${system?.cpuPercent ?? 0}%` }} /></span></section><section data-balloon={system?.memoryAccounting === 'active+wired+compressed' ? 'macOS active + wired + compressed pages; reusable inactive/file cache is excluded' : 'Total memory minus immediately free memory'}><strong>{system?.memoryAccounting === 'active+wired+compressed' ? 'Active RAM' : 'RAM'}</strong><span>{system === null ? 'sampling…' : `${formatBytes(system.memoryUsedBytes)} / ${formatBytes(system.memoryTotalBytes)} · ${system.memoryPercent.toFixed(0)}%`}</span><span className="kd-resource-meter"><i style={{ width: `${system?.memoryPercent ?? 0}%` }} /></span></section></div>
    <div className="kd-monitor-tabs"><SystemButton data-pressed={view === 'agents' || undefined} onClick={() => { setView('agents') }}>Agents ({agents.length})</SystemButton><SystemButton data-pressed={view === 'tasks' || undefined} onClick={() => { setView('tasks') }}>Background ({tasks.filter(task => task.status === 'running' || task.status === 'stopping').length})</SystemButton></div>
    {view === 'agents' ? <><div className="kd-monitor-head"><span>Agent</span><span>Status</span><span>Context</span><span>Model</span><span>Last</span></div>
    <ul className="kd-list kd-scroll kd-monitor-list">{agents.map(agent => <li className="kd-list-row kd-monitor-row" key={agent.sessionId} onDoubleClick={() => { onOpenAgent(agent.sessionId) }}>
      <span className={`kd-led ${agent.status === 'running' ? 'kd-led-running' : ''}`} /><strong data-balloon={agent.sessionId}>{agent.sessionId.slice(0, 10)}</strong><span className={`kd-badge ${agent.status === 'running' ? 'kd-badge-running' : ''}`}>{agent.status}</span><span data-balloon="Latest provider-reported prompt size">{formatContextUsage(agent.context) ?? '—'}</span><span>{agent.model ?? '—'}</span><time>{formatTime(agent.lastActivityAt)}</time>
    </li>)}{agents.length === 0 ? <li className="kd-empty">No live agents are currently exposed by DSH.</li> : null}</ul></> : <><div className="kd-task-head"><span>Agent</span><span>Kind</span><span>Status</span><span>Task</span></div><ul className="kd-list kd-scroll kd-monitor-list">{tasks.map(task => <li className="kd-list-row kd-task-row" key={`${task.sessionId}:${task.id}`} onDoubleClick={() => { onOpenAgent(task.sessionId) }}><strong>{task.agentTitle}</strong><span>{task.kind}</span><span className="kd-badge">{task.status}</span><span data-balloon={task.detail}>{task.label}{task.detail === undefined ? '' : ` · ${task.detail}`}</span></li>)}{tasks.length === 0 ? <li className="kd-empty">No DSH background jobs have been reported.</li> : null}</ul></>}
    <SystemStatusBar>{agents.filter(agent => agent.status === 'running').length} running · {tasks.filter(task => task.status === 'running' || task.status === 'stopping').length} background · {agents.length} live{system === null ? '' : ` · DSH process ${formatBytes(system.processRssBytes)}`}</SystemStatusBar>
  </>
}

export function DisplayControlPanel({ preferences, importedWallpapers, selectedWallpaperId, onChange, onImportWallpaper, onSelectWallpaper, onRemoveWallpaper }: {
  preferences: DisplayPreferences
  importedWallpapers: ImportedWallpaper[]
  selectedWallpaperId: string | null
  onChange: (next: DisplayPreferences) => void
  onImportWallpaper: (wallpaper: ImportedWallpaper) => boolean
  onSelectWallpaper: (id: string) => boolean
  onRemoveWallpaper: (id: string) => boolean
}) {
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [wallpaperBusy, setWallpaperBusy] = useState(false)
  const [wallpaperNotice, setWallpaperNotice] = useState<string | null>(null)
  const update = <Key extends keyof DisplayPreferences>(key: Key, value: DisplayPreferences[Key]) => { onChange({ ...preferences, [key]: value }) }
  const importWallpaper = async (file: File | undefined) => {
    if (file === undefined) return
    setWallpaperBusy(true); setWallpaperNotice(null)
    try {
      const wallpaper = await importWallpaperFile(file, preferences.wallpaperFilterMode, preferences.wallpaperPixelSize)
      if (!onImportWallpaper(wallpaper)) throw new Error('The filtered wallpaper is too large for browser storage. Try a simpler image.')
      onChange({ ...preferences, wallpaper: 'custom' })
      setWallpaperNotice(`${wallpaper.name} · ${wallpaper.width}×${wallpaper.height} · ${wallpaper.filterMode === 'monochrome' ? '1-bit' : 'grayscale'} · ${wallpaper.pixelSize}px blocks`)
    } catch (reason) {
      setWallpaperNotice(errorMessage(reason))
    } finally {
      setWallpaperBusy(false)
      if (fileInput.current !== null) fileInput.current.value = ''
    }
  }
  return <div className="kd-control-panel kd-scroll">
    <SystemPanel title="Desktop Work Area (layout)"><div className="kd-form-stack"><SystemRadio name="resolution" checked={preferences.resolution === 'adaptive'} onChange={() => { update('resolution', 'adaptive') }} label="Fit Browser — automatic" />{RESOLUTION_PRESETS.map(preset => <SystemRadio key={preset.id} name="resolution" checked={preferences.resolution === preset.id} onChange={() => { update('resolution', preset.id) }} label={`${preset.label} — ${preset.width} × ${preset.height}`} />)}<p className="kd-muted">Fit Browser uses all available browser space and recomputes the logical work area at 1× or 2×. Fixed modes preserve period-style dimensions and may scroll when magnified.</p></div></SystemPanel>
    <SystemPanel title="Interface Size"><div className="kd-form-stack"><strong>Base type size</strong>{UI_SIZE_PRESETS.map(preset => <SystemRadio key={preset.baseFontSize} name="base-font-size" checked={preferences.baseFontSize === preset.baseFontSize} onChange={() => { update('baseFontSize', preset.baseFontSize) }} label={`${preset.label} — ${preset.baseFontSize}px`} />)}<p className="kd-muted">Menus, title bars, controls, spacing, scrollbars, and new window sizes follow the 10px or 12px bitmap master.</p><strong>Integer pixel magnification</strong><SystemRadio name="pixel-scale" checked={preferences.pixelScale === 1} onChange={() => { update('pixelScale', 1) }} label="1× — native layout pixels" /><SystemRadio name="pixel-scale" checked={preferences.pixelScale === 2} onChange={() => { update('pixelScale', 2) }} label="2× — exact integer magnification" /><p className="kd-muted">With Fit Browser, 2× halves the logical work area before exact magnification, so the desktop still fits instead of becoming a giant scroll surface.</p></div></SystemPanel>
    <SystemPanel title="System UI Appearance"><div className="kd-form-stack"><SystemRadio name="ui-appearance" checked={preferences.uiAppearance === 'monochrome'} onChange={() => { update('uiAppearance', 'monochrome') }} label="Monochrome — classic grayscale System UI" /><SystemRadio name="ui-appearance" checked={preferences.uiAppearance === 'color'} onChange={() => { update('uiAppearance', 'color') }} label="Muted Color — restrained period-style accents" /><p className="kd-muted">Color mode keeps the desktop and windows neutral, adding subdued color only to Balloon Help, status lights, notifications, and exceptional states.</p></div></SystemPanel>
    <SystemPanel title="Preview Content Filters"><div className="kd-form-stack">
      <SystemCheckbox checked={preferences.filterImages} onChange={event => { update('filterImages', event.currentTarget.checked) }} label="Filter images in Preview" />
      <SystemCheckbox checked={preferences.filterPdf} onChange={event => { update('filterPdf', event.currentTarget.checked) }} label="Filter PDF pages in Preview" />
      <strong>Filter style</strong>
      <SystemRadio name="preview-filter-mode" checked={preferences.filterMode === 'monochrome'} onChange={() => { update('filterMode', 'monochrome') }} label="1-bit Dither — black and white pattern" />
      <SystemRadio name="preview-filter-mode" checked={preferences.filterMode === 'grayscale'} onChange={() => { update('filterMode', 'grayscale') }} label="Direct Grayscale — continuous gray tones" />
      <p className="kd-muted">The selected style applies to each enabled Preview filter. Agent images, code, and source files are left unchanged.</p>
    </div></SystemPanel>
    <SystemPanel title="Desktop Wallpaper"><div className="kd-form-stack">
      <div className="kd-wallpaper-presets">
        <SystemRadio name="wallpaper" checked={preferences.wallpaper === 'classic'} onChange={() => { update('wallpaper', 'classic') }} label={<><i className="kd-wallpaper-chip kd-wallpaper-classic" />Classic Dots</>} />
        <SystemRadio name="wallpaper" checked={preferences.wallpaper === 'gray'} onChange={() => { update('wallpaper', 'gray') }} label={<><i className="kd-wallpaper-chip kd-wallpaper-gray" />Desk Gray</>} />
        <SystemRadio name="wallpaper" checked={preferences.wallpaper === 'pinstripe'} onChange={() => { update('wallpaper', 'pinstripe') }} label={<><i className="kd-wallpaper-chip kd-wallpaper-pinstripe" />Pinstripes</>} />
        <SystemRadio name="wallpaper" checked={preferences.wallpaper === 'cat'} onChange={() => { update('wallpaper', 'cat') }} label={<><i aria-hidden="true" className="kd-wallpaper-chip kd-wallpaper-cats">CAT</i>Cat</>} />
      </div>
      <label htmlFor="kd-imported-wallpapers"><strong>Imported wallpapers</strong></label>
      <SystemSelect id="kd-imported-wallpapers" aria-label="Imported wallpapers" disabled={importedWallpapers.length === 0 || wallpaperBusy} value={selectedWallpaperId ?? ''} onChange={event => {
        const id = event.currentTarget.value
        if (id !== '' && onSelectWallpaper(id)) onChange({ ...preferences, wallpaper: 'custom' })
      }}>
        {importedWallpapers.length === 0 ? <option value="">No imported images</option> : importedWallpapers.map(wallpaper => <option key={wallpaper.id} value={wallpaper.id}>{wallpaper.name} — {wallpaper.width}×{wallpaper.height}</option>)}
      </SystemSelect>
      <strong>Cat / next imported image treatment</strong>
      <SystemRadio name="wallpaper-filter-mode" checked={preferences.wallpaperFilterMode === 'monochrome'} onChange={() => { update('wallpaperFilterMode', 'monochrome') }} label="1-bit Dither — pure black and white" />
      <SystemRadio name="wallpaper-filter-mode" checked={preferences.wallpaperFilterMode === 'grayscale'} onChange={() => { update('wallpaperFilterMode', 'grayscale') }} label="Direct Grayscale — continuous gray tones" />
      <strong>Pixel block size</strong>
      <SystemRadio name="wallpaper-pixel-size" checked={preferences.wallpaperPixelSize === 1} onChange={() => { update('wallpaperPixelSize', 1) }} label="Fine — 1px blocks" />
      <SystemRadio name="wallpaper-pixel-size" checked={preferences.wallpaperPixelSize === 2} onChange={() => { update('wallpaperPixelSize', 2) }} label="Classic — 2px blocks" />
      <strong>Placement</strong>
      <SystemRadio name="wallpaper-fit" checked={preferences.wallpaperFit === 'tile'} onChange={() => { update('wallpaperFit', 'tile') }} label="Tile — repeat at pixel size" />
      <SystemRadio name="wallpaper-fit" checked={preferences.wallpaperFit === 'cover'} onChange={() => { update('wallpaperFit', 'cover') }} label="Fill — cover the desktop" />
      <input ref={fileInput} className="kd-hidden-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={event => { void importWallpaper(event.currentTarget.files?.[0]) }} />
      <div className="kd-settings-actions"><SystemButton disabled={wallpaperBusy} onClick={() => { fileInput.current?.click() }}>{wallpaperBusy ? 'Filtering…' : 'Import Image…'}</SystemButton><SystemButton disabled={selectedWallpaperId === null || wallpaperBusy} onClick={() => {
        if (selectedWallpaperId !== null && onRemoveWallpaper(selectedWallpaperId)) setWallpaperNotice('Selected imported wallpaper removed.')
      }}>Remove Selected</SystemButton></div>
      <p className="kd-muted">Each import is added to the menu above. Import first samples a low-resolution pixel grid, applies grayscale or 1-bit dithering there, then bakes an integer nearest-neighbor enlargement (up to about 512px) into the saved PNG. Changing these controls re-renders Cat; re-import a custom image to apply new treatment.</p>
      {wallpaperNotice === null ? null : <div className="kd-settings-notice" role="status">{wallpaperNotice}</div>}
    </div></SystemPanel>
  </div>
}

export function SettingsApp({ adapter, agentMenuLimit, onAgentMenuLimitChange }: { adapter: DshClientAdapter; agentMenuLimit: AgentMenuLimit; onAgentMenuLimitChange: (limit: AgentMenuLimit) => void }) {
  const [status, setStatus] = useState<{ configured: boolean; source?: string; writable: boolean } | null>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const refresh = () => {
    setError(null)
    void adapter.deepSeekCredential().then(setStatus, reason => { setError(errorMessage(reason)) })
  }
  useEffect(refresh, [adapter])
  const save = async () => {
    if (busy || key.trim() === '') return
    setBusy(true); setError(null); setNotice(null)
    try {
      await adapter.setDeepSeekCredential(key)
      setKey('')
      setNotice('DEEPSEEK_API_KEY saved. New model operations use it immediately.')
      setStatus(await adapter.deepSeekCredential())
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (busy) return
    setBusy(true); setError(null); setNotice(null)
    try {
      await adapter.unsetDeepSeekCredential()
      setConfirmRemove(false)
      setNotice('Stored DEEPSEEK_API_KEY removed.')
      setStatus(await adapter.deepSeekCredential())
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  return <div className="kd-settings kd-scroll">
    <SystemPanel title="DeepSeek Model Access">
      <div className="kd-settings-status" data-configured={status?.configured || undefined}>
        <span className={`kd-led ${status?.configured ? 'kd-led-running' : ''}`} />
        <strong>{status === null ? 'Checking…' : status.configured ? 'API key configured' : 'API key missing'}</strong>
        <span className="kd-spacer" />
        <span>{status?.source === undefined ? '' : `Source: ${status.source}`}</span>
      </div>
      <p>S7R stores this through DSH’s credential service. The saved value is never read back into the browser.</p>
      <form className="kd-key-form" onSubmit={event => { event.preventDefault(); void save() }}>
        <label htmlFor="kd-deepseek-key">DEEPSEEK_API_KEY</label>
        <SystemInput id="kd-deepseek-key" type="password" autoComplete="off" spellCheck={false} value={key} disabled={busy || status?.writable === false} placeholder="Paste a new key — it will not be shown again" onChange={event => { setKey(event.currentTarget.value) }} />
        <SystemButton type="submit" disabled={busy || key.trim() === '' || status?.writable === false}>{busy ? 'Working…' : 'Save Key'}</SystemButton>
      </form>
      {status?.writable === false ? <p className="kd-muted">This key comes from a read-only environment source. Change it where DSH was launched.</p> : null}
      <div className="kd-settings-actions"><SystemButton disabled={busy || status?.configured !== true || status.writable === false} onClick={() => { setConfirmRemove(true) }}>Remove Stored Key…</SystemButton><SystemButton disabled={busy} onClick={refresh}>Refresh Status</SystemButton></div>
      {error === null ? null : <div className="s7-inline-error">{error}</div>}
      {notice === null ? null : <div className="kd-settings-notice" role="status">{notice}</div>}
    </SystemPanel>
    <SystemPanel title="Window Menu"><div className="kd-form-grid">
      <label htmlFor="kd-agent-menu-limit">Recent Agents</label>
      <SystemSelect id="kd-agent-menu-limit" aria-label="Recent Agents in Window menu" value={agentMenuLimit} onChange={event => { onAgentMenuLimitChange(Number(event.currentTarget.value) as AgentMenuLimit) }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(value => <option value={value} key={value}>{value}</option>)}
      </SystemSelect>
    </div><p className="kd-muted">Window shows this many most recently active Agents. The default is 5.</p></SystemPanel>
    <SystemPanel title="What this controls"><p>The default DeepSeek provider expects <code>DEEPSEEK_API_KEY</code>. Provider and model selection remain owned by the Agent session; this setting supplies the credential they use.</p></SystemPanel>
    {confirmRemove ? <SystemDialog title="Remove DeepSeek API Key" onClose={() => { if (!busy) setConfirmRemove(false) }}><p>Remove the DSH-managed DEEPSEEK_API_KEY? Existing Agent history is not deleted.</p><div className="kd-dialog-actions"><SystemButton disabled={busy} onClick={() => { setConfirmRemove(false) }}>Cancel</SystemButton><SystemButton disabled={busy} onClick={() => { void remove() }}>Remove Key</SystemButton></div></SystemDialog> : null}
  </div>
}

export function ClockApp() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(new Date()) }, 1000)
    return () => { window.clearInterval(timer) }
  }, [])
  const second = now.getSeconds() * 6
  const minute = now.getMinutes() * 6 + now.getSeconds() / 10
  const hour = (now.getHours() % 12) * 30 + now.getMinutes() / 2
  return <div className="kd-clock"><div className="kd-clock-face"><span className="kd-clock-hand kd-hour" style={{ transform: `rotate(${hour}deg)` }} /><span className="kd-clock-hand kd-minute" style={{ transform: `rotate(${minute}deg)` }} /><span className="kd-clock-hand kd-second" style={{ transform: `rotate(${second}deg)` }} /><span className="kd-clock-pin" /></div><strong>{now.toLocaleTimeString()}</strong></div>
}

export function PuzzleApp() {
  const [tiles, setTiles] = useState<number[]>(() => shufflePuzzle())
  const [moves, setMoves] = useState(0)
  const solved = puzzleSolved(tiles)
  const newGame = () => { setTiles(shufflePuzzle()); setMoves(0) }
  const move = (index: number) => {
    const next = movePuzzleTile(tiles, index)
    if (next.every((tile, tileIndex) => tile === tiles[tileIndex])) return
    setTiles(next); setMoves(value => value + 1)
  }
  return <>
    <div className="kd-toolbar"><SystemButton onClick={newGame}>New Game</SystemButton><SystemButton onClick={() => { setTiles([...SOLVED_PUZZLE]); setMoves(0) }}>Solve</SystemButton><span className="kd-spacer" /><span>{solved ? 'Ta-da!' : `${moves} moves`}</span></div>
    <div className="kd-puzzle-board" aria-label="15 tile Puzzle">{tiles.map((tile, index) => tile === 0
      ? <span className="kd-puzzle-empty" key="empty" />
      : <button key={tile} className="kd-puzzle-tile" onClick={() => { move(index) }} aria-label={`Move tile ${tile}`}>{tile}</button>)}</div>
    <SystemStatusBar>{solved ? `Solved in ${moves} moves` : 'Arrange the tiles from 1 through 15'}</SystemStatusBar>
  </>
}

export function ScrapbookApp({ cards, initialCardId, onChange, onOpenSource, onPutDesktop }: { cards: readonly ScrapbookCard[]; initialCardId?: string; onChange: (cards: ScrapbookCard[]) => void; onOpenSource: (card: ScrapbookCard) => void; onPutDesktop: (card: ScrapbookCard) => void }) {
  const [index, setIndex] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [copyNotice, setCopyNotice] = useState<string | null>(null)
  const card = cards[Math.min(index, Math.max(0, cards.length - 1))]
  useEffect(() => { if (index >= cards.length) setIndex(Math.max(0, cards.length - 1)) }, [cards.length, index])
  useEffect(() => { if (initialCardId !== undefined) { const at = cards.findIndex(item => item.id === initialCardId); if (at >= 0) setIndex(at) } }, [cards, initialCardId])
  useEffect(() => { setCopyNotice(null) }, [card?.id])
  const create = () => {
    const now = Date.now()
    const next: ScrapbookCard = { id: `card-${now}-${Math.random().toString(16).slice(2)}`, title: 'Untitled Card', kind: 'text', body: '', createdAt: now, updatedAt: now }
    onChange([...cards, next]); setIndex(cards.length)
  }
  const update = (changes: Partial<ScrapbookCard>) => {
    if (card === undefined) return
    onChange(cards.map(item => item.id === card.id ? { ...item, ...changes, updatedAt: Date.now() } : item))
  }
  const remove = () => {
    if (card === undefined) return
    onChange(cards.filter(item => item.id !== card.id))
    setIndex(value => Math.max(0, value - 1))
    setPendingDelete(false)
  }
  const copy = async () => {
    if (card === undefined) return
    try {
      await copyText(card.body ?? '')
      setCopyNotice('Copied card text to the clipboard.')
    } catch (reason) {
      setCopyNotice(`Copy failed: ${errorMessage(reason)}`)
    }
  }
  return <>
    <div className="kd-toolbar"><SystemButton onClick={create}>New Card</SystemButton><SystemButton disabled={card === undefined} onClick={() => { setPendingDelete(true) }}>Delete</SystemButton><SystemButton disabled={index <= 0} onClick={() => { setIndex(value => value - 1) }}>‹</SystemButton><span>{cards.length === 0 ? '0 / 0' : `${index + 1} / ${cards.length}`}</span><SystemButton disabled={index >= cards.length - 1} onClick={() => { setIndex(value => value + 1) }}>›</SystemButton><span className="kd-spacer" />{card?.source === undefined ? null : <SystemButton onClick={() => { onOpenSource(card) }}>Open Source</SystemButton>}<SystemButton disabled={card === undefined} onClick={() => { if (card !== undefined) onPutDesktop(card) }}>Desktop</SystemButton><SystemButton disabled={card === undefined} onClick={() => { void copy() }}>{copyNotice?.startsWith('Copied') ? 'Copied' : 'Copy'}</SystemButton></div>
    {card === undefined ? <div className="kd-empty">The Scrapbook is empty.<br /><br /><SystemButton onClick={create}>Create a Card</SystemButton></div> : <div className="kd-scrap-card"><SystemInput value={card.title} onChange={event => { update({ title: event.currentTarget.value }) }} aria-label="Card title" /><div className="kd-scrap-kind">{card.kind.toUpperCase()} {card.source?.filePath ?? card.source?.sessionId ?? ''}</div><SystemTextArea className={card.kind === 'code' ? 'kd-code' : ''} value={card.body ?? ''} onChange={event => { update({ body: event.currentTarget.value }) }} /></div>}
    <SystemStatusBar>{copyNotice ?? `${cards.length} cards · stored locally in this browser`}</SystemStatusBar>
    {pendingDelete && card !== undefined ? <SystemDialog title="Delete Scrapbook Card" onClose={() => { setPendingDelete(false) }}><p>Delete “{card.title}”? This only removes the local Scrapbook copy.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setPendingDelete(false) }}>Cancel</SystemButton><SystemButton onClick={remove}>Delete</SystemButton></div></SystemDialog> : null}
  </>
}

export function TrashApp({ records, onRestore, onEmpty }: { records: readonly TrashedShortcutRecord[]; onRestore: (ids: string[]) => void; onEmpty: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  useEffect(() => { setSelected(current => current.filter(id => records.some(record => record.shortcut.id === id))) }, [records])
  const toggle = (id: string, additive: boolean) => { setSelected(current => additive ? current.includes(id) ? current.filter(value => value !== id) : [...current, id] : [id]) }
  return <>
    <div className="kd-toolbar"><SystemButton disabled={selected.length === 0} onClick={() => { onRestore(selected); setSelected([]) }}>Put Away</SystemButton><SystemButton disabled={records.length === 0} onClick={() => { onRestore(records.map(record => record.shortcut.id)); setSelected([]) }}>Put Away All</SystemButton><span className="kd-spacer" /><SystemButton disabled={records.length === 0} onClick={() => { setConfirmEmpty(true) }}>Empty Trash…</SystemButton></div>
    <ul className="kd-list kd-scroll kd-trash-list">{records.map(record => <li key={record.shortcut.id} className="kd-list-row" data-selected={selected.includes(record.shortcut.id) || undefined} onClick={event => { toggle(record.shortcut.id, event.metaKey || event.shiftKey) }} onDoubleClick={() => { onRestore([record.shortcut.id]) }}><AppIcon app={record.shortcut.kind === 'workspace' || (record.shortcut.kind === 'path' && record.shortcut.pathType === 'directory') ? 'folder' : record.shortcut.kind === 'agent' ? 'knowledge-desk' : record.shortcut.kind === 'scrapbook' ? 'scrapbook' : 'file'} /><span><strong>{record.shortcut.label}</strong><small>{record.shortcut.kind.toUpperCase()} · trashed {new Date(record.trashedAt).toLocaleString()}</small></span></li>)}{records.length === 0 ? <li className="kd-empty">Trash is empty.</li> : null}</ul>
    <SystemStatusBar>{records.length} desktop {records.length === 1 ? 'alias' : 'aliases'} · original files and Agent history are untouched</SystemStatusBar>
    {confirmEmpty ? <SystemDialog title="Empty Trash" onClose={() => { setConfirmEmpty(false) }}><p>Permanently remove {records.length} S7R desktop {records.length === 1 ? 'alias' : 'aliases'} from Trash?</p><p className="kd-muted">This does not delete files, folders, Workspaces, Agent history, or Scrapbook cards.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setConfirmEmpty(false) }}>Cancel</SystemButton><SystemButton onClick={() => { onEmpty(); setConfirmEmpty(false) }}>Empty Trash</SystemButton></div></SystemDialog> : null}
  </>
}

export function AboutApp({ onClose }: { onClose: () => void }) {
  return <div className="kd-about"><div className="kd-welcome-mark">S7R</div><h2>S7R</h2><p>System 7 Reimagined for DeepSeek Harness.</p><p className="kd-small">Original implementation. Inspired by period desktop interfaces; not affiliated with Apple.</p><SystemButton onClick={onClose}>OK</SystemButton></div>
}
