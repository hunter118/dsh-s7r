import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { contextUsageFromEvents } from '../src/dsh-compat/metrics.ts'
import { cpuPercentBetween } from '../src/dsh-compat/system-metrics.ts'
import { formatBytes, formatContextUsage } from '../src/apps/common.tsx'

describe('real usage metrics', () => {
  it('uses the latest provider token sample and advertised context window', () => {
    const events = [
      { type: 'request/context', seq: 0, time: 1, data: { provider: 'deepseek', model: 'chat', contextWindow: 128_000 } },
      { type: 'assistant/chunk', seq: 1, time: 2, data: { turn: 0, step: 0, chunk: { type: 'usage', usage: { inputTokens: 1000, outputTokens: 20, cacheReadTokens: 3000, cacheWriteTokens: 50 } } } },
      { type: 'assistant/message', seq: 2, time: 3, data: { turn: 0, step: 0, message: { role: 'assistant', content: [] }, usage: { inputTokens: 1200, outputTokens: 30, cacheReadTokens: 3300 } }, surfaceOp: 'append' },
    ] as unknown as SessionEvent[]
    expect(contextUsageFromEvents(events)).toEqual({ contextTokens: 4500, contextWindow: 128_000 })
  })

  it('omits context usage when the provider has not reported token accounting', () => {
    const events = [{ type: 'request/context', seq: 0, time: 1, data: { provider: 'deepseek', model: 'chat' } }] as unknown as SessionEvent[]
    expect(contextUsageFromEvents(events)).toBeUndefined()
  })

  it('derives bounded CPU use from cumulative counter deltas', () => {
    expect(cpuPercentBetween({ idle: 100, total: 200 }, { idle: 125, total: 300 })).toBe(75)
    expect(cpuPercentBetween({ idle: 100, total: 200 }, { idle: 100, total: 200 })).toBeUndefined()
  })

  it('shows a percentage only when capacity is known', () => {
    expect(formatContextUsage({ contextTokens: 4500 })).toBe('4.5K tok')
    expect(formatContextUsage({ contextTokens: 4500, contextWindow: 128_000 })).toBe('4.5K / 128K · 4%')
    expect(formatBytes(128 * 1024 * 1024 * 1024)).toBe('128.0 GB')
  })
})
