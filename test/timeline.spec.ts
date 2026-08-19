import { describe, expect, it } from 'vitest'
import { groupConsecutiveTimelineEvents } from '../src/apps/accessories/timeline-groups.ts'

describe('Timeline folding', () => {
  it('folds adjacent same-type events without crossing a type boundary', () => {
    const events = [
      { seq: 1, time: 1, type: 'assistant/chunk', data: { part: 1 } },
      { seq: 2, time: 2, type: 'assistant/chunk', data: { part: 2 } },
      { seq: 3, time: 3, type: 'assistant/message', data: {} },
      { seq: 4, time: 4, type: 'assistant/chunk', data: { part: 3 } },
    ]
    const groups = groupConsecutiveTimelineEvents(events)
    expect(groups.map(group => [group.type, group.events.map(event => event.seq)])).toEqual([
      ['assistant/chunk', [1, 2]],
      ['assistant/message', [3]],
      ['assistant/chunk', [4]],
    ])
  })
})
