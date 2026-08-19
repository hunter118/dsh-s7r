export const KNOWLEDGE_DESK_RPC_CHANNEL = '/knowledge-desk'

export interface DshCapabilities {
  agents: boolean
  reasoning: boolean
  timeline: boolean
  files: boolean
  terminal: boolean
  terminalResize: boolean
  images: boolean
  toolEvents: boolean
  modelMetrics: boolean
  pdf: boolean
  persistence: 'local'
}

export function createCapabilities(terminal: boolean): DshCapabilities {
  return {
    agents: true,
    reasoning: true,
    timeline: true,
    files: true,
    terminal,
    terminalResize: false,
    images: true,
    toolEvents: true,
    modelMetrics: true,
    pdf: true,
    persistence: 'local',
  }
}

export interface FileEntryView {
  name: string
  path: string
  type: 'file' | 'directory' | 'other'
  size?: number
  version?: string
}

export interface FileListingView {
  path: string
  parentPath?: string | undefined
  entries: FileEntryView[]
}

export interface FileContentView {
  path: string
  mime: string
  encoding: 'utf8' | 'base64'
  content: string
  size: number
  version: string
}

export interface FileWriteView {
  path: string
  operation: 'create' | 'update'
  version: string
}

export interface AgentActivityView {
  sessionId: string
  status: 'idle' | 'running'
  model?: string
  provider?: string
  cwd?: string
  eventCount: number
  lastActivityAt: number
  context?: ContextUsageView
}

export interface ContextUsageView {
  /** Latest provider-reported prompt size, including cache reads and writes. */
  contextTokens: number
  /** Model-advertised combined request/response capacity, when available. */
  contextWindow?: number
}

export interface SessionMetricsView {
  context?: ContextUsageView
}

export interface ContextBreakdownItem {
  kind: 'user' | 'assistant' | 'reasoning' | 'tools' | 'workspace-context' | 'other'
  label: string
  characters: number
  percent: number
  eventCount: number
}

export interface ContextInspectionView extends SessionMetricsView {
  estimatedCharacters: number
  breakdown: ContextBreakdownItem[]
  latestSummary?: string
  latestSummarySeq?: number
}

export interface SessionExportView {
  filename: string
  mime: 'text/markdown' | 'application/json'
  content: string
}

export interface FindTargetView {
  sessionId: string
  label: string
}

export interface FindRequestView {
  query: string
  targets: FindTargetView[]
  sessionIds: string[]
  fileNames: boolean
  sourceContents: boolean
  agentMessages: boolean
  agentEvents: boolean
}

export type FindResultView =
  | { kind: 'file-name' | 'source'; label: string; sessionId: string; path: string; pathType: 'file' | 'directory'; snippet: string; line?: number }
  | { kind: 'agent-message' | 'agent-event'; label: string; sessionId: string; eventSeq: number; eventType: string; snippet: string }

export interface FindResponseView {
  results: FindResultView[]
  truncated: boolean
  filesScanned: number
  eventsScanned: number
}

export interface SystemUsageView {
  sampledAt: number
  cpuCount: number
  /** Absent for the first sample because CPU counters need a time delta. */
  cpuPercent?: number
  memoryUsedBytes: number
  memoryTotalBytes: number
  memoryPercent: number
  memoryAccounting: 'active+wired+compressed' | 'total-free'
  processRssBytes: number
}

export interface TimelineEventView {
  seq: number
  time: number
  type: string
  data: unknown
  surfaceOp?: unknown
  sourceEventSeqs?: readonly number[]
  ignorable?: true
}

export interface TerminalOpenView {
  sessionId: string
  type: string
  motd: string
  pid?: number
  resizeSupported: false
}

export interface TerminalReadView {
  text: string
  totalLines: number
  truncated: boolean
  status?: unknown
}

export type CompatRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; details: Record<string, unknown> } }
