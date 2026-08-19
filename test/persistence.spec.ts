import { describe, expect, it } from 'vitest'
import { DEFAULT_DISPLAY_PREFERENCES, DISPLAY_STORAGE_KEY, migrateDisplayPreferences, readDisplayPreferences, writeDisplayPreferences } from '../src/display/preferences.ts'
import { readScrapbook, SCRAPBOOK_STORAGE_KEY, writeScrapbook, type ScrapbookCard } from '../src/storage/scrapbook.ts'
import { readImportedWallpapers, WALLPAPER_STORAGE_KEY, writeImportedWallpapers, type ImportedWallpaper, type ImportedWallpaperLibrary } from '../src/storage/wallpaper.ts'
import { DESKTOP_STORAGE_KEY, readDesktopPersistence, shortcutId, writeDesktopPersistence, type DesktopPersistence } from '../src/storage/desktop.ts'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('versioned local persistence', () => {
  it('migrates partial or invalid display preferences', () => {
    expect(migrateDisplayPreferences(null)).toEqual(DEFAULT_DISPLAY_PREFERENCES)
    const migrated = migrateDisplayPreferences({ version: 3, resolution: 'compact', palette: 'bad', dithering: false })
    expect(migrated.resolution).toBe('compact')
    expect(migrated.filterPdf).toBe(true)
    expect(migrated).toEqual({ version: 13, resolution: 'compact', baseFontSize: 12, pixelScale: 1, filterImages: true, filterPdf: true, filterMode: 'monochrome', wallpaper: 'classic', wallpaperFilterMode: 'grayscale', wallpaperPixelSize: 1, wallpaperFit: 'tile' })
    expect(migrateDisplayPreferences({ version: 2, resolution: 'classic', uiRaster: 'framebuffer' })).toMatchObject({ version: 13, resolution: 'adaptive', baseFontSize: 12, pixelScale: 1 })
    expect(migrateDisplayPreferences({ version: 4, resolution: 'dense', baseFontSize: 16, pixelScale: 2 })).toMatchObject({ resolution: 'adaptive', baseFontSize: 12, pixelScale: 2 })
    expect(migrateDisplayPreferences({ version: 5, resolution: 'standard', baseFontSize: 10, pixelScale: 2 })).toMatchObject({ resolution: 'standard', baseFontSize: 10, pixelScale: 2 })
    expect(migrateDisplayPreferences({ version: 4, baseFontSize: 14, pixelScale: 3 })).toMatchObject({ baseFontSize: 12, pixelScale: 1 })
    expect(migrateDisplayPreferences({ version: 6, filterImages: false })).toMatchObject({ version: 13, filterImages: false, filterMode: 'monochrome' })
    expect(migrateDisplayPreferences({ version: 7, filterMode: 'grayscale' })).toMatchObject({ version: 13, filterMode: 'grayscale', wallpaper: 'classic' })
    expect(migrateDisplayPreferences({ version: 8, wallpaper: 'cats', wallpaperFilterMode: 'monochrome', wallpaperFit: 'cover' })).toMatchObject({ version: 13, wallpaper: 'cat', wallpaperFilterMode: 'monochrome', wallpaperPixelSize: 1, wallpaperFit: 'cover' })
    expect(migrateDisplayPreferences({ version: 9, wallpaper: 'cats', wallpaperPixelSize: 8 })).toMatchObject({ wallpaper: 'cat', wallpaperPixelSize: 1 })
    expect(migrateDisplayPreferences({ version: 9, wallpaper: 'cats', wallpaperPixelSize: 4 })).toMatchObject({ wallpaper: 'cat', wallpaperPixelSize: 1 })
    expect(migrateDisplayPreferences({ version: 10, wallpaper: 'cats', wallpaperPixelSize: 2 })).toMatchObject({ wallpaper: 'cat', wallpaperPixelSize: 2 })
    expect(migrateDisplayPreferences({ version: 10, wallpaper: 'cat2' })).toMatchObject({ version: 13, wallpaper: 'cat' })
    expect(migrateDisplayPreferences({ version: 11, wallpaper: 'cat2' })).toMatchObject({ version: 13, wallpaper: 'cat' })
    expect(migrateDisplayPreferences({ version: 12, wallpaper: 'cat', wallpaperPixelSize: 1 })).toMatchObject({ version: 13, wallpaper: 'classic', wallpaperPixelSize: 1 })
    expect(migrateDisplayPreferences({ version: 13, wallpaper: 'cat', wallpaperPixelSize: 1 })).toMatchObject({ version: 13, wallpaper: 'cat', wallpaperPixelSize: 1 })
  })

  it('round-trips display preferences', () => {
    const storage = new MemoryStorage()
    const next = { ...DEFAULT_DISPLAY_PREFERENCES, filterImages: false }
    writeDisplayPreferences(storage, next)
    expect(storage.values.has(DISPLAY_STORAGE_KEY)).toBe(true)
    expect(readDisplayPreferences(storage)).toEqual(next)
  })

  it('round-trips validated scrapbook cards and rejects malformed stores', () => {
    const storage = new MemoryStorage()
    const card: ScrapbookCard = { id: 'one', title: 'Note', kind: 'text', body: 'Body', createdAt: 1, updatedAt: 2 }
    writeScrapbook(storage, [card])
    expect(storage.values.has(SCRAPBOOK_STORAGE_KEY)).toBe(true)
    expect(readScrapbook(storage)).toEqual([card])
    storage.setItem(SCRAPBOOK_STORAGE_KEY, JSON.stringify({ version: 2, cards: [card] }))
    expect(readScrapbook(storage)).toEqual([])
  })

  it('round-trips a selected list of validated filtered wallpapers', () => {
    const storage = new MemoryStorage()
    const first: ImportedWallpaper = { version: 4, id: 'one', name: 'desk.png', dataUrl: 'data:image/png;base64,AAAA', width: 324, height: 204, filterMode: 'grayscale', pixelSize: 1, importedAt: 9 }
    const second: ImportedWallpaper = { version: 4, id: 'two', name: 'cat.png', dataUrl: 'data:image/png;base64,BBBB', width: 512, height: 512, filterMode: 'monochrome', pixelSize: 2, importedAt: 10 }
    const library: ImportedWallpaperLibrary = { version: 4, selectedId: 'two', items: [first, second] }
    expect(writeImportedWallpapers(storage, library)).toBe(true)
    expect(storage.values.has(WALLPAPER_STORAGE_KEY)).toBe(true)
    expect(readImportedWallpapers(storage)).toEqual(library)
    storage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({ ...library, selectedId: 'missing' }))
    expect(readImportedWallpapers(storage).items).toEqual([])
    expect(writeImportedWallpapers(storage, { ...library, items: [{ ...first, dataUrl: 'javascript:bad' }] })).toBe(false)
  })

  it('restores desktop windows, aliases, and reversible Agent archives', () => {
    const storage = new MemoryStorage()
    const state: DesktopPersistence = {
      version: 2,
      desktop: {
        windows: [
          { id: 'window-1', appId: 'knowledge-desk', title: 'Agent One', bounds: { x: 20, y: 30, width: 420, height: 280 }, zIndex: 2, state: 'normal', payload: { sessionId: 'session-1' } },
          { id: 'window-2', appId: 'terminal', title: 'Terminal', bounds: { x: 60, y: 70, width: 360, height: 220 }, zIndex: 3, state: 'normal', payload: { sessionId: 'session-1' } },
        ],
        activeId: 'window-1',
        nextId: 3,
        nextZ: 4,
        layoutRestore: [
          { id: 'window-1', bounds: { x: 10, y: 24, width: 400, height: 260 }, state: 'normal' },
          { id: 'window-2', bounds: { x: 30, y: 44, width: 340, height: 200 }, state: 'normal' },
        ],
      },
      shortcuts: [
        { id: shortcutId('workspace', 'workspace-1'), kind: 'workspace', label: 'Project', workspaceId: 'workspace-1', path: '/Projects/one', x: 12, y: 34 },
        { id: shortcutId('path', 'browse:session-1:/Projects/one/src'), kind: 'path', label: 'src', sessionId: 'session-1', path: '/Projects/one/src', pathType: 'directory', folderAction: 'browse', x: 82, y: 34 },
      ],
      archivedAgents: [{ sessionId: 'session-9', title: 'Old Agent', cwd: '/Projects/one', archivedAt: 123 }],
      trash: [{ shortcut: { id: 'agent:trashed', kind: 'agent', label: 'Trashed Agent', sessionId: 'trashed', x: 150, y: 80 }, trashedAt: 456 }],
      renderMarkdown: false,
      agentMenuLimit: 7,
      balloonHelp: true,
    }
    writeDesktopPersistence(storage, state)
    expect(storage.values.has(DESKTOP_STORAGE_KEY)).toBe(true)
    const restored = readDesktopPersistence(storage)
    expect(restored.shortcuts).toEqual(state.shortcuts)
    expect(restored.archivedAgents).toEqual(state.archivedAgents)
    expect(restored.trash).toEqual(state.trash)
    expect(restored.renderMarkdown).toBe(false)
    expect(restored.agentMenuLimit).toBe(7)
    expect(restored.balloonHelp).toBe(true)
    expect(restored.desktop.windows.map(window => window.appId)).toEqual(['knowledge-desk'])
    expect(restored.desktop.activeId).toBe('window-1')
    expect(restored.desktop.layoutRestore?.map(entry => entry.id)).toEqual(['window-1'])
  })

  it('migrates version 1 desktop state with empty Trash and Markdown enabled', () => {
    const storage = new MemoryStorage()
    storage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify({ version: 1, desktop: { windows: [], nextId: 1, nextZ: 1 }, shortcuts: [], archivedAgents: [] }))
    expect(readDesktopPersistence(storage)).toMatchObject({ version: 2, trash: [], renderMarkdown: true, agentMenuLimit: 5, balloonHelp: false })
  })

  it('rejects malformed desktop state instead of partially trusting it', () => {
    const storage = new MemoryStorage()
    storage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify({ version: 1, desktop: { windows: [{ appId: 'unknown' }], nextId: 2, nextZ: 2 }, shortcuts: [], archivedAgents: [] }))
    expect(readDesktopPersistence(storage).desktop.windows).toEqual([])
    storage.setItem(DESKTOP_STORAGE_KEY, '{not-json')
    expect(readDesktopPersistence(storage).shortcuts).toEqual([])
  })
})
