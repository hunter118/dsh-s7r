import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { inspectContext } from '../src/dsh-compat/host.ts'

describe('Context Inspector estimates', () => {
  it('separates assistant text, reasoning, and tool blocks inside one message', () => {
    const events = [{
      type: 'assistant/message', seq: 4, time: 10, sourceEventSeqs: [2, 3],
      data: { turn: 1, step: 1, message: { role: 'assistant', content: [
        { type: 'reasoning', text: 'think' },
        { type: 'text', text: 'answer' },
        { type: 'tool-call', id: 'call-1', name: 'read_file', arguments: '{}' },
      ] } },
    }] as unknown as SessionEvent[]
    const result = inspectContext(events)
    expect(result.breakdown.find(item => item.kind === 'reasoning')?.characters).toBe(5)
    expect(result.breakdown.find(item => item.kind === 'assistant')?.characters).toBe(6)
    expect(result.breakdown.find(item => item.kind === 'tools')?.characters).toBeGreaterThan(2)
    expect(result.breakdown.reduce((sum, item) => sum + item.percent, 0)).toBeCloseTo(100)
  })

  it('does not double-count streamed chunks represented by a final surface message', () => {
    const events = [
      { type: 'assistant/chunk', seq: 2, time: 8, data: { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'duplicate' } } },
      { type: 'assistant/message', seq: 3, time: 9, sourceEventSeqs: [2], data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: 'final' }] } } },
    ] as unknown as SessionEvent[]
    const result = inspectContext(events)
    expect(result.breakdown.find(item => item.kind === 'assistant')?.characters).toBe(5)
  })

  it('uses only the latest request header and excludes non-context ledger metadata', () => {
    const events = [
      { type: 'request/header', seq: 1, time: 1, data: { header: 'old system prompt' } },
      { type: 'turn/start', seq: 2, time: 2, data: { label: 'not context' } },
      { type: 'request/header', seq: 3, time: 3, data: { header: 'new prompt' } },
    ] as unknown as SessionEvent[]
    const result = inspectContext(events)
    expect(result.breakdown).toEqual([{ kind: 'workspace-context', label: 'Workspace/system context', characters: 10, eventCount: 1, percent: 100 }])
  })
})
