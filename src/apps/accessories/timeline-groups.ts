import type { TimelineEventView } from '../../dsh-compat/protocol.ts'

export interface TimelineEventGroup {
  key: string
  type: string
  events: TimelineEventView[]
}

/** Collapse only adjacent events: chronology and type transitions remain lossless. */
export function groupConsecutiveTimelineEvents(events: readonly TimelineEventView[]): TimelineEventGroup[] {
  const groups: TimelineEventGroup[] = []
  for (const event of events) {
    const previous = groups.at(-1)
    if (previous !== undefined && previous.type === event.type) {
      previous.events.push(event)
      continue
    }
    groups.push({ key: `${event.seq}:${event.type}`, type: event.type, events: [event] })
  }
  return groups
}
