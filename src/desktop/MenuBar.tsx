import { useEffect, useState } from 'react'
import type { DesktopWindowState } from './types.ts'

interface MenuItem {
  label?: string
  disabled?: boolean
  checked?: boolean
  action?: () => void
  separator?: true
}

export interface MenuBarProps {
  active?: DesktopWindowState | undefined
  windows: readonly DesktopWindowState[]
  clock: string
  runningAgents: readonly { id: string; title: string }[]
  onAccessory: (app: 'scrapbook' | 'clock' | 'puzzle' | 'monitor' | 'control-panel') => void
  onSettings: () => void
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
  trashCount: number
  onOpenTrash: () => void
  onEmptyTrash: () => void
  onCleanUpDesktop: () => void
  onFocusWindow: (id: string) => void
  onTimeline: () => void
  onFocusAgent: (id: string) => void
  onHelp: () => void
  onAbout: () => void
}

function Menu({ id, label, items, open, setOpen }: { id: string; label: React.ReactNode; items: MenuItem[]; open: string | null; setOpen: (id: string | null) => void }) {
  const active = open === id
  return <div className="kd-menu-wrap"><button className={`kd-menu-button ${id === 'desk' ? 'kd-menu-logo' : ''}`} data-open={active} onPointerDown={event => { event.stopPropagation(); setOpen(active ? null : id) }}>{label}</button>
    {active ? <div className="kd-menu-popover">{items.map((item, index) => item.separator
      ? <div className="kd-menu-separator" key={index} />
      : <button className="kd-menu-item" key={`${item.label}-${index}`} disabled={item.disabled} onClick={() => { setOpen(null); item.action?.() }}><span className="kd-menu-check">{item.checked ? '✓' : ''}</span>{item.label}</button>)}</div> : null}
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
  const desk: MenuItem[] = [
    { label: 'About S7R…', action: props.onAbout }, { separator: true },
    { label: 'Settings…', action: props.onSettings },
    { label: 'Scrapbook', action: () => { props.onAccessory('scrapbook') } },
    { label: 'Clock', action: () => { props.onAccessory('clock') } },
    { label: 'Puzzle', action: () => { props.onAccessory('puzzle') } },
    { label: 'Monitor', action: () => { props.onAccessory('monitor') } },
    { label: 'Display Control Panel', action: () => { props.onAccessory('control-panel') } },
  ]
  const file: MenuItem[] = [
    { label: 'Choose Folder…', action: props.onChooseFolder },
    { label: 'Browse Current Workspace', action: props.onOpenFinder },
    { separator: true },
    { label: 'Open Agent…', action: props.onOpenAgents },
    { label: 'New Agent', action: props.onNewAgent },
    { label: 'New Terminal', action: props.onOpenTerminal },
    { label: 'Find…', action: props.onFind },
    { label: 'Open Timeline', disabled: active?.appId !== 'knowledge-desk', action: props.onTimeline },
    ...(props.runningAgents.length === 0 ? [] : [
      { separator: true as const },
      ...props.runningAgents.map(item => ({ label: `● ${item.title}`, action: () => { props.onFocusAgent(item.id) } })),
    ]),
    { separator: true }, { label: 'Save', disabled: active?.appId !== 'textedit', action: props.onSave },
    { separator: true }, { label: 'Close Window', disabled: active === undefined, action: props.onClose },
  ]
  const editItems: MenuItem[] = [
    { label: 'Undo', action: () => { edit('undo') } }, { separator: true },
    { label: 'Cut', action: () => { edit('cut') } }, { label: 'Copy', action: () => { edit('copy') } },
    { label: 'Paste', action: () => { edit('paste') } }, { label: 'Select All', action: () => { edit('selectAll') } },
  ]
  const view: MenuItem[] = [{ label: 'Display Control Panel…', action: () => { props.onAccessory('control-panel') } }, { label: 'Refresh Active View', action: () => { window.dispatchEvent(new Event('knowledge-desk:refresh-active')) } }]
  const windowItems: MenuItem[] = [
    { label: 'Zoom', disabled: active === undefined, action: props.onZoom },
    { label: 'Collapse', disabled: active === undefined, action: props.onCollapse },
    { label: 'Tile Windows', disabled: props.windows.length === 0, action: props.onTile }, { separator: true },
    ...props.windows.map(window => ({ label: window.title, checked: window.id === active?.id, action: () => { props.onFocusWindow(window.id) } })),
  ]
  const special: MenuItem[] = [
    { label: 'Clean Up Desktop', action: props.onCleanUpDesktop },
    { separator: true },
    { label: `Open Trash${props.trashCount === 0 ? '' : ` (${props.trashCount})`}`, action: props.onOpenTrash },
    { label: 'Empty Trash…', disabled: props.trashCount === 0, action: props.onEmptyTrash },
  ]
  return <nav className="kd-menu-bar" aria-label="Global menu bar" onPointerDown={event => { event.stopPropagation() }}>
    <Menu id="desk" label="S7R" items={desk} open={open} setOpen={setOpen} /><Menu id="file" label="File" items={file} open={open} setOpen={setOpen} /><Menu id="edit" label="Edit" items={editItems} open={open} setOpen={setOpen} /><Menu id="view" label="View" items={view} open={open} setOpen={setOpen} /><Menu id="window" label="Window" items={windowItems} open={open} setOpen={setOpen} /><Menu id="special" label="Special" items={special} open={open} setOpen={setOpen} /><Menu id="help" label="Help" items={[{ label: 'S7R Guide…', action: props.onHelp }, { separator: true }, { label: 'About S7R…', action: props.onAbout }]} open={open} setOpen={setOpen} /><span className="kd-menu-clock">{props.clock}</span>
  </nav>
}
