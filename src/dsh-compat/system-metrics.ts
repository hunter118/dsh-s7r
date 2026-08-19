import { execFile } from 'node:child_process'
import { cpus, freemem, platform, totalmem } from 'node:os'
import type { SystemUsageView } from './protocol.ts'

export interface CpuTimesSnapshot {
  idle: number
  total: number
}

export function cpuTimesSnapshot(): CpuTimesSnapshot {
  let idle = 0
  let total = 0
  for (const cpu of cpus()) {
    idle += cpu.times.idle
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq
  }
  return { idle, total }
}

export function cpuPercentBetween(previous: CpuTimesSnapshot, current: CpuTimesSnapshot): number | undefined {
  const totalDelta = current.total - previous.total
  const idleDelta = current.idle - previous.idle
  if (totalDelta <= 0 || idleDelta < 0) return undefined
  return Math.max(0, Math.min(100, (1 - idleDelta / totalDelta) * 100))
}

let previousCpu: CpuTimesSnapshot | undefined

export interface MacVmStatUsage {
  pageSize: number
  memoryUsedBytes: number
}

export function parseMacVmStat(output: string): MacVmStatUsage | undefined {
  const pageSize = /page size of\s+(\d+)\s+bytes/i.exec(output)?.[1]
  if (pageSize === undefined) return undefined
  const pages = new Map<string, number>()
  for (const line of output.split(/\r?\n/)) {
    const match = /^([^:]+):\s+(\d+)\.?\s*$/.exec(line.trim())
    if (match !== null) pages.set(match[1]!.trim(), Number(match[2]))
  }
  const active = pages.get('Pages active')
  const wired = pages.get('Pages wired down')
  const compressed = pages.get('Pages occupied by compressor')
  if (active === undefined || wired === undefined || compressed === undefined) return undefined
  const size = Number(pageSize)
  if (!Number.isSafeInteger(size) || size <= 0) return undefined
  return { pageSize: size, memoryUsedBytes: (active + wired + compressed) * size }
}

function readVmStat(): Promise<MacVmStatUsage | undefined> {
  return new Promise(resolve => {
    execFile('/usr/bin/vm_stat', { encoding: 'utf8', timeout: 1000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      resolve(error === null ? parseMacVmStat(stdout) : undefined)
    })
  })
}

export async function readSystemUsage(): Promise<SystemUsageView> {
  const currentCpu = cpuTimesSnapshot()
  const cpuPercent = previousCpu === undefined ? undefined : cpuPercentBetween(previousCpu, currentCpu)
  previousCpu = currentCpu
  const memoryTotalBytes = totalmem()
  const macMemory = platform() === 'darwin' ? await readVmStat() : undefined
  const fallbackUsedBytes = Math.max(0, memoryTotalBytes - freemem())
  const memoryUsedBytes = Math.max(0, Math.min(memoryTotalBytes, macMemory?.memoryUsedBytes ?? fallbackUsedBytes))
  return {
    sampledAt: Date.now(),
    cpuCount: cpus().length,
    ...(cpuPercent === undefined ? {} : { cpuPercent }),
    memoryUsedBytes,
    memoryTotalBytes,
    memoryPercent: memoryTotalBytes === 0 ? 0 : memoryUsedBytes / memoryTotalBytes * 100,
    memoryAccounting: macMemory === undefined ? 'total-free' : 'active+wired+compressed',
    processRssBytes: process.memoryUsage().rss,
  }
}
