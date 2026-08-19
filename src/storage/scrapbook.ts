export interface ScrapbookCard {
  id: string
  title: string
  kind: 'text' | 'code' | 'image' | 'reference'
  body?: string
  source?: { sessionId?: string; eventId?: string; filePath?: string }
  createdAt: number
  updatedAt: number
}

interface ScrapbookStore {
  version: 1
  cards: ScrapbookCard[]
}

export const SCRAPBOOK_STORAGE_KEY = 'knowledge-desk.scrapbook.v1'

export function readScrapbook(storage: Pick<Storage, 'getItem'> | undefined): ScrapbookCard[] {
  if (storage === undefined) return []
  try {
    const parsed = JSON.parse(storage.getItem(SCRAPBOOK_STORAGE_KEY) ?? 'null') as unknown
    if (typeof parsed !== 'object' || parsed === null) return []
    const store = parsed as Partial<ScrapbookStore>
    if (store.version !== 1 || !Array.isArray(store.cards)) return []
    return store.cards.filter((card): card is ScrapbookCard => {
      if (typeof card !== 'object' || card === null) return false
      const value = card as Partial<ScrapbookCard>
      return typeof value.id === 'string' && typeof value.title === 'string'
        && (value.kind === 'text' || value.kind === 'code' || value.kind === 'image' || value.kind === 'reference')
        && typeof value.createdAt === 'number' && typeof value.updatedAt === 'number'
    })
  } catch {
    return []
  }
}

export function writeScrapbook(storage: Pick<Storage, 'setItem'> | undefined, cards: readonly ScrapbookCard[]): void {
  try {
    storage?.setItem(SCRAPBOOK_STORAGE_KEY, JSON.stringify({ version: 1, cards }))
  } catch {
    // The cards remain in memory if browser storage is unavailable.
  }
}
