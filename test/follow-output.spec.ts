import { describe, expect, it } from 'vitest'
import { isNearOutputEnd } from '../src/apps/knowledge-desk/follow-output.ts'

describe('conversation output following', () => {
  it('follows only while the reader remains close to the latest output', () => {
    expect(isNearOutputEnd({ scrollHeight: 1000, scrollTop: 668, clientHeight: 300 })).toBe(true)
    expect(isNearOutputEnd({ scrollHeight: 1000, scrollTop: 500, clientHeight: 300 })).toBe(false)
  })
})
