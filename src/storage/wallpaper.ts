export type WallpaperFilterMode = 'monochrome' | 'grayscale'
export type WallpaperPixelSize = 1 | 2

export interface ImportedWallpaper {
  version: 4
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
  filterMode: WallpaperFilterMode
  pixelSize: WallpaperPixelSize
  importedAt: number
}

export interface ImportedWallpaperLibrary {
  version: 4
  selectedId: string | null
  items: ImportedWallpaper[]
}

export const WALLPAPER_STORAGE_KEY = 's7r.wallpapers.v4'
export const EMPTY_WALLPAPER_LIBRARY: ImportedWallpaperLibrary = Object.freeze({ version: 4, selectedId: null, items: [] })

function validWallpaper(value: unknown): value is ImportedWallpaper {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<ImportedWallpaper>
  return item.version === 4
    && typeof item.id === 'string' && item.id.length > 0
    && typeof item.name === 'string'
    && typeof item.dataUrl === 'string'
    && /^data:image\/png;base64,/.test(item.dataUrl)
    && typeof item.width === 'number' && Number.isSafeInteger(item.width) && item.width > 0
    && typeof item.height === 'number' && Number.isSafeInteger(item.height) && item.height > 0
    && (item.filterMode === 'monochrome' || item.filterMode === 'grayscale')
    && (item.pixelSize === 1 || item.pixelSize === 2)
    && typeof item.importedAt === 'number'
}

function validLibrary(value: unknown): value is ImportedWallpaperLibrary {
  if (typeof value !== 'object' || value === null) return false
  const library = value as Partial<ImportedWallpaperLibrary>
  if (library.version !== 4 || !Array.isArray(library.items) || !library.items.every(validWallpaper)) return false
  if (library.selectedId !== null && typeof library.selectedId !== 'string') return false
  const ids = new Set(library.items.map(item => item.id))
  return ids.size === library.items.length && (library.selectedId === null || ids.has(library.selectedId))
}

export function readImportedWallpapers(storage: Pick<Storage, 'getItem'> | undefined): ImportedWallpaperLibrary {
  if (storage === undefined) return EMPTY_WALLPAPER_LIBRARY
  try {
    const raw = storage.getItem(WALLPAPER_STORAGE_KEY)
    if (raw === null) return EMPTY_WALLPAPER_LIBRARY
    const parsed: unknown = JSON.parse(raw)
    return validLibrary(parsed) ? parsed : EMPTY_WALLPAPER_LIBRARY
  } catch {
    return EMPTY_WALLPAPER_LIBRARY
  }
}

export function writeImportedWallpapers(storage: Pick<Storage, 'setItem'> | undefined, library: ImportedWallpaperLibrary): boolean {
  if (!validLibrary(library)) return false
  try {
    storage?.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(library))
    return true
  } catch {
    return false
  }
}
