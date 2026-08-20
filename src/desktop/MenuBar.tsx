import { useEffect, useState } from 'react'
import type { DesktopWindowState } from './types.ts'

interface MenuItem {
  label?: string
  disabled?: boolean
  checked?: boolean
  action?: () => void
  separator?: true
  heading?: true
}

export interface MenuBarProps {
  active?: DesktopWindowState | undefined
  windows: readonly DesktopWindowState[]
  clock: string
  agents: readonly { id: string; title: string; status: 'running' | 'completed' | 'idle'; updatedAt: number }[]
  agentMenuLimit: number
  onAccessory: (app: 'scrapbook' | 'clock' | 'puzzle' | 'monitor' | 'control-panel') => void
  onSettings: () => void
  onDshControl: () => void
  onStationery: () => void
  onNewAgent: () => void
  onChooseFolder: () => void
  onOpenAgents: () => void
  onOpenFinder: () => void
  onOpenTerminal: () => void
  onFind: () => void
  onClose: () => void
  onSave: () => void
  onZoom: () => void
  onCollapse: () => void
  onTile: () => void
  onRestoreLayout: () => void
  hasRestorableLayout: boolean
  trashCount: number
  onOpenTrash: () => void
  onEmptyTrash: () => void
  onCleanUpDesktop: () => void
  onFocusWindow: (id: string) => void
  onTimeline: () => void
  onFocusAgent: (id: string) => void
  onStopAgent: (id: string) => void
  onHelp: () => void
  balloonHelp: boolean
  onBalloonHelpChange: (enabled: boolean) => void
  onAbout: () => void
}

function Menu({ id, label, items, open, setOpen }: { id: string; label: React.ReactNode; items: MenuItem[]; open: string | null; setOpen: (id: string | null) => void }) {
  const active = open === id
  const focusItem = (edge: 'first' | 'last' = 'first') => { window.setTimeout(() => { const buttons = document.querySelectorAll<HTMLButtonElement>(`[data-menu="${id}"] .kd-menu-item:not(:disabled)`); buttons[edge === 'first' ? 0 : buttons.length - 1]?.focus() }, 0) }
  return <div className="kd-menu-wrap" data-menu={id}><button className={`kd-menu-button ${id === 'desk' ? 'kd-menu-logo' : ''}`} aria-haspopup="menu" aria-expanded={active} data-open={active} onPointerDown={event => { event.stopPropagation(); setOpen(active ? null : id) }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(id); focusItem() } }}>{label}</button>
    {active ? <div className="kd-menu-popover" role="menu" onKeyDown={event => {
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.kd-menu-item:not(:disabled)')]
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus() }
      else if (event.key === 'Home') { event.preventDefault(); items[0]?.focus() }
      else if (event.key === 'End') { event.preventDefault(); items.at(-1)?.focus() }
      else if (event.key === 'Escape') { event.preventDefault(); setOpen(null) }
    }}>{items.map((item, index) => item.separator
      ? <div className="kd-menu-separator" key={index} />
      : item.heading ? <div className="kd-menu-section" key={`${item.label}-${index}`}>{item.label}</div>
        : <button className="kd-menu-item" role="menuitem" key={`${item.label}-${index}`} disabled={item.disabled} onClick={() => { setOpen(null); item.action?.() }}><span className="kd-menu-check">{item.checked ? '✓' : ''}</span>{item.label}</button>)}</div> : null}
  </div>
}

export function MenuBar(props: MenuBarProps) {
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => {
    const close = () => { setOpen(null) }
    window.addEventListener('pointerdown', close)
    return () => { window.removeEventListener('pointerdown', close) }
  }, [])
  const edit = (command: string) => { document.execCommand(command) }
  const active = props.active
  const activeSessionId = typeof active?.payload?.sessionId === 'string' ? active.payload.sessionId : undefined
  const activeAgent = props.agents.find(agent => agent.id === activeSessionId)
  const editable = active !== undefined && ['knowledge-desk', 'textedit', 'terminal', 'find', 'scrapbook', 'settings'].includes(active.appId)
  const desk: MenuItem[] = [
    { label: 'About S7R…', action: props.onAbout }, { separator: true },
    { label: 'Settings…', action: props.onSettings },
    { label: 'DSH Control Center…', action: props.onDshControl },
    { label: 'Scrapbook', action: () => { props.onAccessory('scrapbook') } },
    { label: 'Monitor', action: () => { props.onAccessory('monitor') } },
    { label: 'Display Control Panel…', action: () => { props.onAccessory('control-panel') } },
    { separator: true },
    { label: 'Clock', action: () => { props.onAccessory('clock') } },
    { label: 'Puzzle', action: () => { props.onAccessory('puzzle') } },
  ]
  const file: MenuItem[] = [
    { label: 'New Agent', action: props.onNewAgent },
    { label: 'New from Stationery…', action: props.onStationery },
    { label: 'Open Agent…', action: props.onOpenAgents },
    { label: 'Choose Folder…', action: props.onChooseFolder },
    { label: 'Browse Current Workspace', action: props.onOpenFinder },
    { separator: true },
    { label: 'New Terminal', action: props.onOpenTerminal },
    { label: 'Find…', action: props.onFind },
    ...(active?.appId === 'textedit' ? [{ separator: true as const }, { label: 'Save', action: props.onSave }] : []),
    ...(active?.appId === 'knowledge-desk' && activeSessionId !== undefined ? [{ separator: true as const }, { label: 'Open Agent Timeline', action: props.onTimeline }, ...(activeAgent?.status === 'running' ? [{ label: 'Stop Running Agent', action: () => { props.onStopAgent(activeSessionId) } }] : [])] : []),
    { separator: true }, { label: 'Close Window', disabled: active === undefined, action: props.onClose },
  ]
  const editItems: MenuItem[] = [
    { label: 'Undo', disabled: !editable, action: () => { edit('undo') } }, { separator: true },
    { label: 'Cut', disabled: !editable, action: () => { edit('cut') } }, { label: 'Copy', disabled: active === undefined, action: () => { edit('copy') } },
    { label: 'Paste', disabled: !editable, action: () => { edit('paste') } }, { label: 'Select All', disabled: active === undefined, action: () => { edit('selectAll') } },
  ]
  const agents = recentMenuAgents(props.agents, props.agentMenuLimit)
  const windowItems: MenuItem[] = [
    { label: 'Zoom', disabled: active === undefined || active.resizable === false || active.appId === 'clock' || active.appId === 'puzzle' || active.appId === 'agent-setup', action: props.onZoom },
    { label: 'Collapse', disabled: active === undefined, action: props.onCollapse },
    { label: 'Tile Windows', disabled: props.windows.length === 0, action: props.onTile },
    { label: 'Restore Previous Layout', disabled: !props.hasRestorableLayout, action: props.onRestoreLayout },
    ...(props.windows.length === 0 ? [] : [{ separator: true as const }, { heading: true as const, label: 'Open Windows' }, ...[...props.windows].sort((left, right) => right.zIndex - left.zIndex).map(window => ({ label: window.title, checked: window.id === active?.id, action: () => { props.onFocusWindow(window.id) } }))]),
    ...(agents.length === 0 ? [] : [{ separator: true as const }, { heading: true as const, label: 'Agents' }, ...agents.map(agent => ({ label: `${agent.status === 'running' ? '●' : agent.status === 'completed' ? '◇' : '○'} ${agent.title}`, action: () => { props.onFocusAgent(agent.id) } }))]),
  ]
  const special: MenuItem[] = [
    { label: 'Clean Up Desktop', action: props.onCleanUpDesktop },
    { separator: true },
    { label: `Open Trash${props.trashCount === 0 ? '' : ` (${props.trashCount})`}`, action: props.onOpenTrash },
    { label: 'Empty Trash…', disabled: props.trashCount === 0, action: props.onEmptyTrash },
  ]
  const helpItems: MenuItem[] = [
    { label: 'Show Balloon Help', checked: props.balloonHelp, action: () => { props.onBalloonHelpChange(!props.balloonHelp) } },
    { separator: true },
    { label: 'S7R Guide…', action: props.onHelp },
  ]
  return <nav className="kd-menu-bar" aria-label="Global menu bar" onPointerDown={event => { event.stopPropagation() }}>
    <Menu id="desk" label="S7R" items={desk} open={open} setOpen={setOpen} /><Menu id="file" label="File" items={file} open={open} setOpen={setOpen} /><Menu id="edit" label="Edit" items={editItems} open={open} setOpen={setOpen} /><Menu id="window" label="Window" items={windowItems} open={open} setOpen={setOpen} /><Menu id="special" label="Special" items={special} open={open} setOpen={setOpen} /><Menu id="help" label="Help" items={helpItems} open={open} setOpen={setOpen} /><span className="kd-menu-clock">{props.clock}</span>
  </nav>
}

export function recentMenuAgents<T extends { updatedAt: number }>(agents: readonly T[], limit: number): T[] {
  const safeLimit = Math.max(1, Math.min(9, Math.trunc(limit)))
  return [...agents].sort((left, right) => right.updatedAt - left.updatedAt).slice(0, safeLimit)
}
