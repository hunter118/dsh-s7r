export const S7R_DRAG_TYPE = 'application/x-s7r-desktop-item'

export type S7RDragItem =
  | { kind: 'workspace'; label: string; workspaceId: string; path: string; shortcutId?: string; shortcutIds?: string[] }
  | { kind: 'agent'; label: string; sessionId: string; cwd?: string; shortcutId?: string; shortcutIds?: string[] }
  | { kind: 'path'; label: string; sessionId: string; path: string; pathType: 'file' | 'directory'; folderAction?: 'browse' | 'workspace'; shortcutId?: string; shortcutIds?: string[] }
  | { kind: 'scrapbook'; label: string; cardId: string; shortcutId?: string; shortcutIds?: string[] }

export function relativePathReference(path: string, cwd: string | undefined): string {
  if (cwd === undefined) return path
  const root = cwd.replace(/[\\/]+$/, '')
  if (path === root) return '.'
  if (path.startsWith(`${root}/`) || path.startsWith(`${root}\\`)) return `./${path.slice(root.length + 1).replace(/\\/g, '/')}`
  return path
}

export function writeDragItem(transfer: DataTransfer, item: S7RDragItem): void {
  transfer.effectAllowed = 'copyMove'
  transfer.setData(S7R_DRAG_TYPE, JSON.stringify(item))
  transfer.setData('text/plain', item.kind === 'path' ? item.path : item.label)
}

export function readDragItem(transfer: DataTransfer): S7RDragItem | null {
  try {
    const raw = transfer.getData(S7R_DRAG_TYPE)
    if (raw === '') return null
    const item = JSON.parse(raw) as Partial<S7RDragItem>
    const shortcutValid = item.shortcutId === undefined || typeof item.shortcutId === 'string'
    const shortcutIdsValid = item.shortcutIds === undefined || (Array.isArray(item.shortcutIds) && item.shortcutIds.every(id => typeof id === 'string'))
    if (!shortcutValid || !shortcutIdsValid) return null
    if (item.kind === 'workspace' && typeof item.label === 'string' && typeof item.workspaceId === 'string' && typeof item.path === 'string') return item as S7RDragItem
    if (item.kind === 'agent' && typeof item.label === 'string' && typeof item.sessionId === 'string' && (item.cwd === undefined || typeof item.cwd === 'string')) return item as S7RDragItem
    if (item.kind === 'path' && typeof item.label === 'string' && typeof item.sessionId === 'string' && typeof item.path === 'string' && (item.pathType === 'file' || item.pathType === 'directory') && (item.folderAction === undefined || item.folderAction === 'browse' || item.folderAction === 'workspace')) return item as S7RDragItem
    if (item.kind === 'scrapbook' && typeof item.label === 'string' && typeof item.cardId === 'string') return item as S7RDragItem
  } catch {
    return null
  }
  return null
}
