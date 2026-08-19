import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { FsTarget, FsVersion as FsVersionType } from '@deepseek-ai/dsh-fs'
import { FsVersion } from '@deepseek-ai/dsh-fs'
import type { SessionEvent, SessionHeader, SessionId } from '@deepseek-ai/dsh-session'
import { TerminalSessionId } from '@deepseek-ai/dsh-terminal'
import type { TerminalSignal } from '@deepseek-ai/dsh-terminal'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-terminal'
import type {
  AgentActivityView,
  ContextBreakdownItem,
  ContextInspectionView,
  FindRequestView,
  FindResponseView,
  FindResultView,
  SessionMetricsView,
  SessionExportView,
  DshCapabilities,
  FileContentView,
  FileEntryView,
  FileListingView,
  FileWriteView,
  TerminalOpenView,
  TerminalReadView,
  TimelineEventView,
} from './protocol.ts'
import { createCapabilities, KNOWLEDGE_DESK_RPC_CHANNEL } from './protocol.ts'
import { contextUsageFromEvents } from './metrics.ts'
import { readSystemUsage } from './system-metrics.ts'

type JsonRecord = Record<string, unknown>

type HostResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: 'internal'; message: string; details: Record<string, never> } }

function ok<T>(value: T): HostResult<T> {
  return { ok: true, value }
}

function fail(code: string, message: string, _details: JsonRecord = {}): HostResult<never> {
  return { ok: false, error: { code: 'internal', message: `[${code}] ${message}`, details: {} } }
}

function record(value: unknown): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('request payload must be an object')
  }
  return value as JsonRecord
}

function stringField(payload: JsonRecord, name: string, optional = false): string | undefined {
  const value = payload[name]
  if (value === undefined && optional) return undefined
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`)
  return value
}

function numberField(payload: JsonRecord, name: string, fallback: number): number {
  const value = payload[name]
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback
}

function booleanField(payload: JsonRecord, name: string): boolean {
  return payload[name] === true
}

function agentFor(ctx: Context, rawId: string): Agent {
  const agent = ctx.agents.get(rawId as SessionId)
  if (agent === undefined) {
    const error = new Error(`Agent session ${JSON.stringify(rawId)} is not live yet.`) as Error & { code: string }
    error.code = 'agent-not-live'
    throw error
  }
  return agent
}

interface SessionInspectionView {
  readonly header: SessionHeader
  readonly events: readonly SessionEvent[]
}

async function inspectSession(ctx: Context, rawId: string): Promise<SessionInspectionView> {
  const id = rawId as SessionId
  const agent = ctx.agents.get(id)
  if (agent !== undefined) return { header: agent.session.header, events: agent.session.events }
  const inspected = await ctx.sessionPersistence.inspect(id)
  return { header: inspected.meta, events: inspected.events }
}

async function workspaceTarget(ctx: Context, header: SessionHeader, path: string | undefined): Promise<{ root: FsTarget; target: FsTarget }> {
  const cwd = header.cwd
  if (cwd === undefined) throw new Error('this session has no workspace directory')
  const fs = ctx.fs
  const root = await fs.resolve(cwd)
  const target = await fs.resolve(path ?? cwd, { cwd })
  if (!fs.contains(root, target)) throw new Error(`path is outside the session workspace: ${target.displayPath}`)
  return { root, target }
}

function parentPath(path: string, root: string): string | undefined {
  if (path === root) return undefined
  const normalized = path.replace(/[\\/]+$/, '')
  const index = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  if (index <= 0) return root
  const parent = normalized.slice(0, index)
  return parent.length < root.length ? root : parent
}

function mimeFor(path: string): string {
  const extension = path.toLowerCase().split('.').pop()
  switch (extension) {
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'bmp': return 'image/bmp'
    case 'svg': return 'image/svg+xml'
    case 'pdf': return 'application/pdf'
    case 'md': return 'text/markdown'
    case 'json': return 'application/json'
    case 'html': return 'text/html'
    case 'css': return 'text/css'
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs': return 'text/javascript'
    case 'ts':
    case 'tsx': return 'text/typescript'
    default: return 'text/plain'
  }
}

function isBinaryMime(mime: string): boolean {
  return mime.startsWith('image/') || mime === 'application/pdf'
}

function latestActivity(agent: Agent): number {
  const events = agent.session.events
  return events.at(-1)?.time ?? agent.session.header.createdAt
}

function stringsOf(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) for (const item of value) stringsOf(item, output)
  else if (typeof value === 'object' && value !== null) for (const item of Object.values(value)) stringsOf(item, output)
  return output
}

function eventCategory(event: SessionEvent): ContextBreakdownItem['kind'] {
  if (event.type.startsWith('user/') || event.type.startsWith('steering/')) return 'user'
  if (event.type.startsWith('tool/')) return 'tools'
  if (event.type.startsWith('context/') || event.type.startsWith('request/')) return 'workspace-context'
  if (event.type.startsWith('assistant/')) return 'assistant'
  return 'other'
}

const CATEGORY_LABELS: Record<ContextBreakdownItem['kind'], string> = {
  user: 'User messages', assistant: 'Assistant output', reasoning: 'Reasoning', tools: 'Tool calls/results', 'workspace-context': 'Workspace/system context', other: 'Other event data',
}

type CategoryTotals = Map<ContextBreakdownItem['kind'], { characters: number; eventCount: number }>

function addCategory(totals: CategoryTotals, kind: ContextBreakdownItem['kind'], characters: number, eventCount = 1): void {
  if (characters === 0 && eventCount === 0) return
  const current = totals.get(kind) ?? { characters: 0, eventCount: 0 }
  totals.set(kind, { characters: current.characters + characters, eventCount: current.eventCount + eventCount })
}

function assistantCharacters(value: unknown, kind: ContextBreakdownItem['kind'] = 'assistant', output = new Map<ContextBreakdownItem['kind'], number>()): Map<ContextBreakdownItem['kind'], number> {
  if (typeof value === 'string') {
    output.set(kind, (output.get(kind) ?? 0) + value.length)
    return output
  }
  if (Array.isArray(value)) {
    for (const item of value) assistantCharacters(item, kind, output)
    return output
  }
  if (typeof value !== 'object' || value === null) return output
  const record = value as Record<string, unknown>
  const type = typeof record.type === 'string' ? record.type : typeof record.kind === 'string' ? record.kind : undefined
  const nextKind = type === 'reasoning' || type === 'reasoning-delta'
    ? 'reasoning'
    : type === 'tool-call' || type === 'tool-result' || type === 'tool-call-delta'
      ? 'tools'
      : kind
  for (const [key, item] of Object.entries(record)) {
    // Structural labels are metadata, not user-visible context content.
    if (key === 'type' || key === 'kind' || key === 'role') continue
    assistantCharacters(item, nextKind, output)
  }
  return output
}

export function inspectContext(events: readonly SessionEvent[]): ContextInspectionView {
  const sourced = new Set<number>()
  for (const event of events) {
    const seqs = (event as unknown as { sourceEventSeqs?: readonly number[] }).sourceEventSeqs
    if (seqs !== undefined) for (const seq of seqs) sourced.add(seq)
  }
  const totals: CategoryTotals = new Map()
  let latestSummary: string | undefined
  let latestSummarySeq: number | undefined
  const latestRequestHeaderSeq = events.findLast(event => event.type === 'request/header')?.seq
  const latestRequestContextSeq = events.findLast(event => event.type === 'request/context')?.seq
  for (const event of events) {
    const eventType = String(event.type)
    if (sourced.has(event.seq) && event.type === 'assistant/chunk') continue
    const kind = eventCategory(event)
    if (event.type === 'request/header' && event.seq !== latestRequestHeaderSeq) continue
    if (event.type === 'request/context' && event.seq !== latestRequestContextSeq) continue
    // Turn boundaries, title-generation payloads, permissions, and other ledger
    // metadata are searchable in Timeline/Find but are not conversational context.
    if (kind === 'other' && eventType !== 'compaction/summary') continue
    if (kind === 'assistant') {
      const split = assistantCharacters(event.data)
      for (const [splitKind, characters] of split) addCategory(totals, splitKind, characters)
      if (split.size === 0) addCategory(totals, kind, 0)
    } else addCategory(totals, eventType === 'compaction/summary' ? 'workspace-context' : kind, stringsOf(event.data).reduce((sum, text) => sum + text.length, 0))
    if (eventType === 'compaction/summary') {
      const candidate = stringsOf(event.data).sort((a, b) => b.length - a.length)[0]
      if (candidate !== undefined) { latestSummary = candidate; latestSummarySeq = event.seq }
    }
  }
  const estimatedCharacters = [...totals.values()].reduce((sum, item) => sum + item.characters, 0)
  const order: ContextBreakdownItem['kind'][] = ['user', 'assistant', 'reasoning', 'tools', 'workspace-context', 'other']
  const breakdown = order.map(kind => {
    const item = totals.get(kind) ?? { characters: 0, eventCount: 0 }
    return { kind, label: CATEGORY_LABELS[kind], ...item, percent: estimatedCharacters === 0 ? 0 : item.characters / estimatedCharacters * 100 }
  }).filter(item => item.characters > 0 || item.eventCount > 0)
  const context = contextUsageFromEvents(events)
  return { estimatedCharacters, breakdown, ...(context === undefined ? {} : { context }), ...(latestSummary === undefined || latestSummarySeq === undefined ? {} : { latestSummary, latestSummarySeq }) }
}

function safeFilename(value: string): string {
  const normalized = value.trim().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '')
  return normalized === '' ? 'agent' : normalized.slice(0, 80)
}

function exportSession(session: SessionInspectionView, sessionId: string, title: string, format: 'markdown' | 'json'): SessionExportView {
  const filename = `${safeFilename(title)}-${sessionId.slice(-8)}.${format === 'json' ? 'json' : 'md'}`
  if (format === 'json') return { filename, mime: 'application/json', content: JSON.stringify({ sessionId, title, header: session.header, events: session.events }, null, 2) }
  const lines = [`# ${title}`, '', `Session: \`${sessionId}\``, session.header.cwd === undefined ? '' : `Workspace: \`${session.header.cwd}\``, '']
  for (const event of session.events) {
    lines.push(`## ${event.type} · ${new Date(event.time).toISOString()} · #${event.seq}`, '')
    const text = stringsOf(event.data).join('\n').trim()
    if (text !== '') lines.push(text, '')
    else lines.push('```json', JSON.stringify(event.data, null, 2), '```', '')
  }
  return { filename, mime: 'text/markdown', content: lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n') }
}

const SOURCE_EXTENSIONS = new Set(['txt', 'md', 'json', 'yaml', 'yml', 'toml', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'css', 'html', 'py', 'rs', 'go', 'java', 'c', 'cc', 'cpp', 'h', 'hpp', 'sh', 'zsh', 'sql', 'xml', 'svg'])

function resultSnippet(text: string, query: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  const at = compact.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
  if (at < 0) return compact.slice(0, 180)
  return compact.slice(Math.max(0, at - 55), Math.min(compact.length, at + query.length + 115))
}

async function searchWorkspace(ctx: Context, target: FindRequestView['targets'][number], query: string, names: boolean, source: boolean, results: FindResultView[], counters: { files: number }, limit: number): Promise<void> {
  const inspected = await inspectSession(ctx, target.sessionId)
  const { root } = await workspaceTarget(ctx, inspected.header, undefined)
  const queue: FsTarget[] = [root]
  const visited = new Set<string>()
  while (queue.length > 0 && results.length < limit && counters.files < 5000) {
    const directory = queue.shift()!
    if (visited.has(directory.displayPath)) continue
    visited.add(directory.displayPath)
    const entries = await ctx.fs.listDir(directory)
    for (const entry of entries) {
      if (results.length >= limit || counters.files >= 5000) return
      if (entry.type === 'directory') {
        if (names && entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) results.push({ kind: 'file-name', label: target.label, sessionId: target.sessionId, path: entry.target.displayPath, pathType: 'directory', snippet: entry.target.displayPath })
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') queue.push(entry.target)
        continue
      }
      if (entry.type !== 'file') continue
      counters.files += 1
      if (names && entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) results.push({ kind: 'file-name', label: target.label, sessionId: target.sessionId, path: entry.target.displayPath, pathType: 'file', snippet: entry.target.displayPath })
      if (!source || results.length >= limit || (entry.size ?? 0) > 1024 * 1024) continue
      const extension = entry.name.toLocaleLowerCase().split('.').pop() ?? ''
      if (!SOURCE_EXTENSIONS.has(extension)) continue
      try {
        const content = await ctx.fs.readText(entry.target)
        const lower = content.toLocaleLowerCase(); const needle = query.toLocaleLowerCase(); const at = lower.indexOf(needle)
        if (at >= 0) results.push({ kind: 'source', label: target.label, sessionId: target.sessionId, path: entry.target.displayPath, pathType: 'file', snippet: resultSnippet(content, query), line: content.slice(0, at).split('\n').length })
      } catch {
        // A file changing or becoming unreadable during a search is skipped.
      }
    }
  }
}

async function findAll(ctx: Context, payload: JsonRecord): Promise<FindResponseView> {
  const query = stringField(payload, 'query')!
  const rawTargets = Array.isArray(payload.targets) ? payload.targets : []
  const targets = rawTargets.flatMap(value => {
    if (typeof value !== 'object' || value === null) return []
    const item = value as JsonRecord
    return typeof item.sessionId === 'string' && typeof item.label === 'string' ? [{ sessionId: item.sessionId, label: item.label }] : []
  }).slice(0, 32)
  const sessionIds = Array.isArray(payload.sessionIds) ? payload.sessionIds.filter((value): value is string => typeof value === 'string').slice(0, 500) : []
  const request: FindRequestView = { query, targets, sessionIds, fileNames: booleanField(payload, 'fileNames'), sourceContents: booleanField(payload, 'sourceContents'), agentMessages: booleanField(payload, 'agentMessages'), agentEvents: booleanField(payload, 'agentEvents') }
  const results: FindResultView[] = []; const counters = { files: 0, events: 0 }; const limit = 200
  if (request.fileNames || request.sourceContents) for (const target of request.targets) await searchWorkspace(ctx, target, query, request.fileNames, request.sourceContents, results, counters, limit)
  if ((request.agentMessages || request.agentEvents) && results.length < limit) for (const id of request.sessionIds) {
    let session: SessionInspectionView
    try { session = await inspectSession(ctx, id) } catch { continue }
    for (const event of session.events) {
      if (results.length >= limit) break
      counters.events += 1
      const eventType = String(event.type)
      const message = eventType === 'user/message' || eventType === 'assistant/message' || eventType === 'steering/message'
      if (!request.agentEvents && !(request.agentMessages && message)) continue
      const text = stringsOf(event.data).join('\n')
      if (!text.toLocaleLowerCase().includes(query.toLocaleLowerCase())) continue
      results.push({ kind: request.agentEvents && !message ? 'agent-event' : 'agent-message', label: id, sessionId: id, eventSeq: event.seq, eventType, snippet: resultSnippet(text, query) })
    }
    if (results.length >= limit) break
  }
  return { results, truncated: results.length >= limit || counters.files >= 5000, filesScanned: counters.files, eventsScanned: counters.events }
}

async function listFiles(ctx: Context, header: SessionHeader, payload: JsonRecord): Promise<HostResult<FileListingView>> {
  const requested = stringField(payload, 'path', true)
  const { root, target } = await workspaceTarget(ctx, header, requested)
  const fs = ctx.fs
  const entries = await fs.listDir(target)
  const views: FileEntryView[] = entries.map(entry => ({
    name: entry.name,
    path: entry.target.displayPath,
    type: entry.type,
    ...(entry.size === undefined ? {} : { size: entry.size }),
    ...(entry.version === undefined ? {} : { version: String(entry.version) }),
  }))
  const parent = parentPath(target.displayPath, root.displayPath)
  const listing: FileListingView = {
    path: target.displayPath,
    entries: views,
    ...(parent === undefined ? {} : { parentPath: parent }),
  }
  return ok(listing)
}

async function readFile(ctx: Context, header: SessionHeader, payload: JsonRecord): Promise<HostResult<FileContentView>> {
  const path = stringField(payload, 'path')!
  const { target } = await workspaceTarget(ctx, header, path)
  const fs = ctx.fs
  const info = await fs.stat(target)
  if (info === undefined) return fail('not-found', `file not found: ${path}`)
  if (info.type !== 'file') return fail('not-file', `not a regular file: ${path}`)
  const mime = mimeFor(target.displayPath)
  if (isBinaryMime(mime)) {
    const bytes = await fs.readBytes(target, undefined, 25 * 1024 * 1024)
    return ok({
      path: target.displayPath,
      mime,
      encoding: 'base64',
      content: Buffer.from(bytes).toString('base64'),
      size: bytes.byteLength,
      version: String(info.version),
    })
  }
  const content = await fs.readText(target)
  return ok({
    path: target.displayPath,
    mime,
    encoding: 'utf8',
    content,
    size: Buffer.byteLength(content),
    version: String(info.version),
  })
}

async function writeFile(ctx: Context, header: SessionHeader, payload: JsonRecord): Promise<HostResult<FileWriteView>> {
  const path = stringField(payload, 'path')!
  if (typeof payload.content !== 'string') throw new Error('content must be a string')
  const content = payload.content
  const expectedVersion = stringField(payload, 'expectedVersion', true)
  const { target } = await workspaceTarget(ctx, header, path)
  const fs = ctx.fs
  const info = await fs.stat(target)
  if (info !== undefined && expectedVersion === undefined) {
    return fail('save-conflict', 'saving an existing file requires the version returned by read', { path })
  }
  const expected = info === undefined
    ? { kind: 'createIfAbsent' as const }
    : { kind: 'replaceIfVersion' as const, version: FsVersion(expectedVersion!) as FsVersionType }
  const outcome = await fs.writeText(target, content, expected)
  return ok({ path: target.displayPath, operation: outcome.operation, version: String(outcome.version) })
}

async function handleEndpoint(ctx: Context, endpoint: string, rawPayload: unknown): Promise<HostResult<unknown>> {
  const payload = record(rawPayload)
  if (endpoint === 'capabilities') {
    const capabilities: DshCapabilities = createCapabilities(ctx.terminals.listBackends().length > 0)
    return ok(capabilities)
  }
  if (endpoint === 'agents/list') {
    const agents: AgentActivityView[] = ctx.agents.list().map(agent => {
      const context = contextUsageFromEvents(agent.session.events)
      return {
        sessionId: String(agent.id),
        status: agent.status,
        ...(agent.options.model === undefined ? {} : { model: agent.options.model }),
        ...(agent.options.provider === undefined ? {} : { provider: agent.options.provider }),
        ...(agent.session.header.cwd === undefined ? {} : { cwd: agent.session.header.cwd }),
        eventCount: agent.session.events.length,
        lastActivityAt: latestActivity(agent),
        ...(context === undefined ? {} : { context }),
      }
    })
    return ok(agents)
  }
  if (endpoint === 'system/usage') return ok(await readSystemUsage())
  if (endpoint === 'find/search') return ok(await findAll(ctx, payload))
  const sessionId = stringField(payload, 'sessionId')!
  switch (endpoint) {
    case 'session/metrics': {
      const session = await inspectSession(ctx, sessionId)
      const context = contextUsageFromEvents(session.events)
      const metrics: SessionMetricsView = { ...(context === undefined ? {} : { context }) }
      return ok(metrics)
    }
    case 'session/context': {
      const session = await inspectSession(ctx, sessionId)
      return ok(inspectContext(session.events))
    }
    case 'session/export': {
      const session = await inspectSession(ctx, sessionId)
      const format = payload.format === 'json' ? 'json' : 'markdown'
      const title = typeof payload.title === 'string' && payload.title.trim() !== '' ? payload.title : `Agent ${sessionId.slice(-8)}`
      return ok(exportSession(session, sessionId, title, format))
    }
    case 'timeline/list': {
      const session = await inspectSession(ctx, sessionId)
      const events: TimelineEventView[] = session.events.map(event => {
        const envelope = event as unknown as { surfaceOp?: unknown; sourceEventSeqs?: readonly number[]; ignorable?: true }
        return {
          seq: event.seq,
          time: event.time,
          type: event.type,
          data: event.data,
          ...(envelope.surfaceOp === undefined ? {} : { surfaceOp: envelope.surfaceOp }),
          ...(envelope.sourceEventSeqs === undefined ? {} : { sourceEventSeqs: envelope.sourceEventSeqs }),
          ...(envelope.ignorable === undefined ? {} : { ignorable: envelope.ignorable }),
        }
      })
      return ok(events)
    }
    case 'files/list': {
      const session = await inspectSession(ctx, sessionId)
      return await listFiles(ctx, session.header, payload)
    }
    case 'files/read': {
      const session = await inspectSession(ctx, sessionId)
      return await readFile(ctx, session.header, payload)
    }
    case 'files/write': {
      const session = await inspectSession(ctx, sessionId)
      return await writeFile(ctx, session.header, payload)
    }
    case 'terminal/open': {
      const agent = agentFor(ctx, sessionId)
      const backends = ctx.terminals.listBackends()
      const type = backends.includes('shell') ? 'shell' : backends[0]
      if (type === undefined) return fail('terminal-unavailable', 'no DSH terminal backend is registered')
      const cwd = stringField(payload, 'cwd', true) ?? agent.session.header.cwd
      if (cwd !== undefined) await workspaceTarget(ctx, agent.session.header, cwd)
      const opened = await ctx.terminals.spawn(agent, {
        type,
        name: `S7R ${sessionId.slice(0, 8)}`,
        ...(cwd === undefined ? {} : { cwd }),
      })
      const value: TerminalOpenView = {
        sessionId: String(opened.sessionId),
        type: opened.type,
        motd: opened.motd,
        resizeSupported: false,
        ...(opened.pid === undefined ? {} : { pid: opened.pid }),
      }
      return ok(value)
    }
    case 'terminal/send': {
      const agent = agentFor(ctx, sessionId)
      const terminalId = TerminalSessionId(stringField(payload, 'terminalId')!)
      const text = typeof payload.text === 'string' ? payload.text : ''
      const submit = payload.submit !== false
      const operation = ctx.terminals.startSend(agent, terminalId, { text, submit })
      void operation.done.catch(() => undefined)
      return ok({ accepted: true })
    }
    case 'terminal/read': {
      const agent = agentFor(ctx, sessionId)
      const terminalId = TerminalSessionId(stringField(payload, 'terminalId')!)
      const result = ctx.terminals.read(agent, terminalId, {
        offset: numberField(payload, 'offset', 0),
        count: Math.min(numberField(payload, 'count', 500), 2000),
      })
      const session = ctx.terminals.list(agent).find(item => item.sessionId === terminalId)
      const value: TerminalReadView = {
        text: result.text,
        totalLines: result.totalLines,
        truncated: result.truncated,
        ...(session === undefined ? {} : { status: session.status }),
      }
      return ok(value)
    }
    case 'terminal/signal': {
      const agent = agentFor(ctx, sessionId)
      const terminalId = TerminalSessionId(stringField(payload, 'terminalId')!)
      const rawSignal = stringField(payload, 'signal')!
      const allowed: TerminalSignal[] = ['SIGINT', 'SIGTERM', 'SIGKILL', 'SIGTSTP', 'SIGHUP']
      if (!allowed.includes(rawSignal as TerminalSignal)) throw new Error(`unsupported signal ${rawSignal}`)
      return ok(await ctx.terminals.signal(agent, terminalId, rawSignal as TerminalSignal))
    }
    case 'terminal/close': {
      const agent = agentFor(ctx, sessionId)
      const terminalId = TerminalSessionId(stringField(payload, 'terminalId')!)
      return ok({ closed: await ctx.terminals.kill(agent, terminalId, 'S7R terminal window closed') })
    }
    case 'terminal/resize':
      return ok({ supported: false })
    default:
      return fail('not-found', `unknown Knowledge Desk RPC endpoint: ${endpoint}`)
  }
}

export const inject = ['connection', 'agents', 'sessions', 'sessionPersistence', 'fs', 'terminals']

export function apply(ctx: Context): void {
  ctx.connection.rpc.handle(
    KNOWLEDGE_DESK_RPC_CHANNEL,
    async (endpoint, payload) => {
      try {
        return await handleEndpoint(ctx, endpoint, payload)
      } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code: unknown }).code)
          : 'knowledge-desk-error'
        return fail(code, error instanceof Error ? error.message : String(error))
      }
    },
    { authority: 'loopback' },
  )
}
