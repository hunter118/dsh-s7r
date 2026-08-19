import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ContextUsageView } from './protocol.ts'

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Fold only durable provider accounting; no client-side token estimate is invented. */
export function contextUsageFromEvents(events: readonly SessionEvent[]): ContextUsageView | undefined {
  let contextTokens: number | undefined
  let contextWindow: number | undefined
  for (const event of events) {
    if (event.type === 'request/context') {
      contextWindow = finiteNonNegative(event.data.contextWindow) && event.data.contextWindow > 0
        ? event.data.contextWindow
        : undefined
      continue
    }
    const usage = event.type === 'assistant/message'
      ? event.data.usage
      : event.type === 'assistant/chunk' && event.data.chunk.type === 'usage'
        ? event.data.chunk.usage
        : undefined
    if (usage === undefined) continue
    const input = finiteNonNegative(usage.inputTokens) ? usage.inputTokens : 0
    const cacheRead = finiteNonNegative(usage.cacheReadTokens) ? usage.cacheReadTokens : 0
    const cacheWrite = finiteNonNegative(usage.cacheWriteTokens) ? usage.cacheWriteTokens : 0
    contextTokens = input + cacheRead + cacheWrite
  }
  if (contextTokens === undefined) return undefined
  return {
    contextTokens,
    ...(contextWindow === undefined ? {} : { contextWindow }),
  }
}
