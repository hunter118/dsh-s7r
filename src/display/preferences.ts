import type { BaseFontSize, PixelScale, ResolutionPresetId } from '../desktop/resolution.ts'

export interface DisplayPreferences {
  version: 14
  resolution: ResolutionPresetId
  baseFontSize: BaseFontSize
  pixelScale: PixelScale
  uiAppearance: 'monochrome' | 'color'
  filterImages: boolean
  filterPdf: boolean
  filterMode: 'monochrome' | 'grayscale'
  wallpaper: 'classic' | 'gray' | 'pinstripe' | 'cat' | 'custom'
  wallpaperFilterMode: 'monochrome' | 'grayscale'
  wallpaperPixelSize: 1 | 2
  wallpaperFit: 'tile' | 'cover'
}

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  version: 14,
  resolution: 'adaptive',
  baseFontSize: 12,
  pixelScale: 1,
  uiAppearance: 'monochrome',
  filterImages: true,
  filterPdf: true,
  filterMode: 'monochrome',
  wallpaper: 'classic',
  wallpaperFilterMode: 'grayscale',
  wallpaperPixelSize: 1,
  wallpaperFit: 'tile',
}

export const DISPLAY_STORAGE_KEY = 'knowledge-desk.display.v1'

export function migrateDisplayPreferences(value: unknown): DisplayPreferences {
  if (typeof value !== 'object' || value === null) return DEFAULT_DISPLAY_PREFERENCES
  const input = value as Partial<Record<keyof DisplayPreferences, unknown>>
  const storedResolution = input.resolution === 'adaptive' || input.resolution === 'classic' || input.resolution === 'compact' || input.resolution === 'expanded' || input.resolution === 'standard'
    ? input.resolution
    : DEFAULT_DISPLAY_PREFERENCES.resolution
  const knownVersion = input.version === 3 || input.version === 4 || input.version === 5 || input.version === 6 || input.version === 7 || input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14
  const resolution = input.resolution === 'dense' ? 'adaptive' : knownVersion ? storedResolution : DEFAULT_DISPLAY_PREFERENCES.resolution
  const baseFontSize = (input.version === 4 || input.version === 5 || input.version === 6 || input.version === 7 || input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.baseFontSize === 10 || input.baseFontSize === 12)
    ? input.baseFontSize as BaseFontSize
    : DEFAULT_DISPLAY_PREFERENCES.baseFontSize
  const pixelScale = (input.version === 4 || input.version === 5 || input.version === 6 || input.version === 7 || input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.pixelScale === 1 || input.pixelScale === 2)
    ? input.pixelScale
    : DEFAULT_DISPLAY_PREFERENCES.pixelScale
  const bool = <K extends keyof DisplayPreferences>(key: K): boolean =>
    typeof input[key] === 'boolean' ? input[key] as boolean : DEFAULT_DISPLAY_PREFERENCES[key] as boolean
  const wallpaper: DisplayPreferences['wallpaper'] = (input.version === 13 || input.version === 14) && input.wallpaper === 'cat'
    ? 'cat'
    : input.version === 12 && input.wallpaper === 'cat'
      ? 'classic'
    : (input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11) && (input.wallpaper === 'cats' || input.wallpaper === 'cat2')
      ? 'cat'
      : (input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.wallpaper === 'classic' || input.wallpaper === 'gray' || input.wallpaper === 'pinstripe' || input.wallpaper === 'custom')
        ? input.wallpaper
        : DEFAULT_DISPLAY_PREFERENCES.wallpaper
  return {
    version: 14,
    resolution,
    baseFontSize,
    pixelScale,
    uiAppearance: input.version === 14 && (input.uiAppearance === 'monochrome' || input.uiAppearance === 'color')
      ? input.uiAppearance
      : DEFAULT_DISPLAY_PREFERENCES.uiAppearance,
    filterImages: bool('filterImages'),
    filterPdf: bool('filterPdf'),
    filterMode: (input.version === 7 || input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.filterMode === 'monochrome' || input.filterMode === 'grayscale')
      ? input.filterMode
      : DEFAULT_DISPLAY_PREFERENCES.filterMode,
    wallpaper,
    wallpaperFilterMode: (input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.wallpaperFilterMode === 'monochrome' || input.wallpaperFilterMode === 'grayscale')
      ? input.wallpaperFilterMode
      : DEFAULT_DISPLAY_PREFERENCES.wallpaperFilterMode,
    wallpaperPixelSize: (input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.wallpaperPixelSize === 1 || input.wallpaperPixelSize === 2)
      ? input.wallpaperPixelSize
      : DEFAULT_DISPLAY_PREFERENCES.wallpaperPixelSize,
    wallpaperFit: (input.version === 8 || input.version === 9 || input.version === 10 || input.version === 11 || input.version === 12 || input.version === 13 || input.version === 14) && (input.wallpaperFit === 'tile' || input.wallpaperFit === 'cover')
      ? input.wallpaperFit
      : DEFAULT_DISPLAY_PREFERENCES.wallpaperFit,
  }
}

export function readDisplayPreferences(storage: Pick<Storage, 'getItem'> | undefined): DisplayPreferences {
  if (storage === undefined) return DEFAULT_DISPLAY_PREFERENCES
  try {
    const raw = storage.getItem(DISPLAY_STORAGE_KEY)
    return raw === null ? DEFAULT_DISPLAY_PREFERENCES : migrateDisplayPreferences(JSON.parse(raw))
  } catch {
    return DEFAULT_DISPLAY_PREFERENCES
  }
}

export function writeDisplayPreferences(
  storage: Pick<Storage, 'setItem'> | undefined,
  preferences: DisplayPreferences,
): void {
  try {
    storage?.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Storage denial or quota exhaustion leaves the current in-memory preference usable.
  }
}
