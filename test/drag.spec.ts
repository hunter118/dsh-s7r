import { describe, expect, it } from 'vitest'
import { readDragItem, relativePathReference, S7R_DRAG_TYPE, writeDragItem, type S7RDragItem } from '../src/desktop/drag.ts'

class MemoryTransfer {
  effectAllowed = 'uninitialized'
  values = new Map<string, string>()
  setData(type: string, value: string) { this.values.set(type, value) }
  getData(type: string) { return this.values.get(type) ?? '' }
}

describe('S7R desktop drag records', () => {
  it('round-trips paths with their explicit Finder or Workspace folder meaning', () => {
    const transfer = new MemoryTransfer()
    const item: S7RDragItem = { kind: 'path', label: 'src', sessionId: 'session-1', path: '/Project/src', pathType: 'directory', folderAction: 'workspace' }
    writeDragItem(transfer as unknown as DataTransfer, item)
    expect(transfer.effectAllowed).toBe('copyMove')
    expect(transfer.values.get('text/plain')).toBe('/Project/src')
    expect(readDragItem(transfer as unknown as DataTransfer)).toEqual(item)
  })

  it('round-trips Workspace, Agent, and single-card Scrapbook records', () => {
    const items: S7RDragItem[] = [
      { kind: 'workspace', label: 'Project', workspaceId: 'workspace-1', path: '/Project' },
      { kind: 'agent', label: 'Agent', sessionId: 'session-1', cwd: '/Project' },
      { kind: 'scrapbook', label: 'Note', cardId: 'card-1' },
    ]
    for (const item of items) {
      const transfer = new MemoryTransfer()
      writeDragItem(transfer as unknown as DataTransfer, item)
      expect(readDragItem(transfer as unknown as DataTransfer)).toEqual(item)
    }
  })

  it('round-trips a validated multi-selection drag record', () => {
    const transfer = new MemoryTransfer()
    const item: S7RDragItem = { kind: 'agent', label: 'Agent', sessionId: 'session-1', shortcutId: 'agent:one', shortcutIds: ['agent:one', 'path:two'] }
    writeDragItem(transfer as unknown as DataTransfer, item)
    expect(readDragItem(transfer as unknown as DataTransfer)).toEqual(item)
    transfer.values.set(S7R_DRAG_TYPE, JSON.stringify({ ...item, shortcutIds: ['agent:one', 2] }))
    expect(readDragItem(transfer as unknown as DataTransfer)).toBeNull()
  })

  it('rejects malformed or unrelated drag payloads', () => {
    const transfer = new MemoryTransfer()
    expect(readDragItem(transfer as unknown as DataTransfer)).toBeNull()
    transfer.values.set(S7R_DRAG_TYPE, JSON.stringify({ kind: 'path', label: 'bad', sessionId: 'one', path: '/bad', pathType: 'directory', folderAction: 'delete' }))
    expect(readDragItem(transfer as unknown as DataTransfer)).toBeNull()
    transfer.values.set(S7R_DRAG_TYPE, '{bad-json')
    expect(readDragItem(transfer as unknown as DataTransfer)).toBeNull()
  })

  it('turns contained paths into portable Agent references', () => {
    expect(relativePathReference('/Project/src/index.ts', '/Project')).toBe('./src/index.ts')
    expect(relativePathReference('/Project', '/Project/')).toBe('.')
    expect(relativePathReference('/Elsewhere/file.ts', '/Project')).toBe('/Elsewhere/file.ts')
    expect(relativePathReference('C:\\Project\\src\\index.ts', 'C:\\Project')).toBe('./src/index.ts')
  })
})
