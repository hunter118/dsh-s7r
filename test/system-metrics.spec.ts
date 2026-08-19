import { describe, expect, it } from 'vitest'
import { cpuPercentBetween, parseMacVmStat } from '../src/dsh-compat/system-metrics.ts'

describe('system metrics', () => {
  it('computes CPU percentage from counter deltas', () => {
    expect(cpuPercentBetween({ idle: 50, total: 100 }, { idle: 70, total: 200 })).toBe(80)
    expect(cpuPercentBetween({ idle: 50, total: 100 }, { idle: 50, total: 100 })).toBeUndefined()
  })

  it('excludes reusable inactive and file-cache pages from macOS active RAM', () => {
    const parsed = parseMacVmStat(`Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 200.\nPages active: 100.\nPages inactive: 900.\nPages wired down: 20.\nFile-backed pages: 800.\nPages occupied by compressor: 5.\n`)
    expect(parsed).toEqual({ pageSize: 16384, memoryUsedBytes: 125 * 16384 })
  })

  it('rejects incomplete vm_stat samples', () => {
    expect(parseMacVmStat('Mach Virtual Memory Statistics: (page size of 4096 bytes)\nPages active: 1.')).toBeUndefined()
  })
})
