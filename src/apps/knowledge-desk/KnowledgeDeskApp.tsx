import { Fragment, memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AssistantBlock, ConversationNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { DshClientAdapter } from '../../dsh-compat/client.ts'
import type { ContextInspectionView } from '../../dsh-compat/protocol.ts'
import type { DisplayPreferences } from '../../display/preferences.ts'
import type { ArchivedAgentRecord } from '../../storage/desktop.ts'
import { readDragItem, relativePathReference, writeDragItem, type S7RDragItem } from '../../desktop/drag.ts'
import { AuthenticImage } from '../../display/AuthenticImage.tsx'
import { pixelizeEmoji } from '../../display/pixel-emoji.ts'
import { SystemButton, SystemCheckbox, SystemDialog, SystemInput, SystemSelect, SystemStatusBar, SystemTextArea } from '../../system7/primitives.tsx'
import { SessionSnapshot, errorMessage, formatContextUsage, formatTime } from '../common.tsx'
import { MarkdownText } from './MarkdownText.tsx'
import { isNearOutputEnd } from './follow-output.ts'

interface KnowledgeDeskAppProps {
  adapter: DshClientAdapter
  sessionId?: string | undefined
  sessions: readonly { id: string; title: string; running: boolean; completed?: boolean; cwd?: string; updatedAt: number; workspaceId?: string; workspaceTitle?: string }[]
  workspaces: readonly { id: string; title: string; path: string; sessionIds: string[] }[]
  currentWorkspaceId?: string | undefined
  archivedAgents: readonly ArchivedAgentRecord[]
  upstreamArchivedIds: readonly string[]
  preferences: DisplayPreferences
  renderMarkdown: boolean
  onRenderMarkdownChange: (enabled: boolean) => void
  onOpenSession: (sessionId: string) => void
  onArchiveSession: (sessionId: string) => Promise<void>
  onRestoreSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, title: string) => Promise<void>
  onExportSession: (sessionId: string, format: 'markdown' | 'json', title: string) => Promise<void>
  onCreateHandoff: (sessionId: string, summary: string) => Promise<void>
  onAddDesktopItem: (item: S7RDragItem) => void
  onNewSession: (workspaceId?: string) => Promise<void>
  onChooseFolder: () => Promise<void>
  onOpenWorkspace: (workspaceId: string) => Promise<void>
  onSelectWorkspace: (workspaceId: string) => void
  onOpenSettings: () => void
  onOpenTimeline: (sessionId: string) => void
  onOpenFile: (sessionId: string, path: string) => void
  onAddScrap: (card: { title: string; kind: 'text' | 'code' | 'reference'; body: string; sessionId: string; eventId?: string }) => void
}

function textOfContent(content: readonly unknown[]): string {
  return content.map(block => {
    if (typeof block !== 'object' || block === null) return String(block)
    const value = block as Record<string, unknown>
    if (value.type === 'text' || value.type === 'reasoning') return typeof value.text === 'string' ? value.text : ''
    return value.type === 'image' ? '[Image]' : JSON.stringify(value)
  }).join('\n')
}

const FILE_PATTERN = /((?:\.\.?\/|\/)[\w@%+.,~()\-\/\\ ]+\.(?:txt|md|json|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|css|html|py|rs|go|java|c|cc|cpp|h|hpp|pdf|png|jpe?g|gif|webp|bmp|svg))/gi
const FILE_PART = /^(?:\.\.?\/|\/).+\.(?:txt|md|json|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|css|html|py|rs|go|java|c|cc|cpp|h|hpp|pdf|png|jpe?g|gif|webp|bmp|svg)$/i

function LinkedText({ text, onOpenFile }: { text: string; onOpenFile: (path: string) => void }) {
  const parts = pixelizeEmoji(text).split(FILE_PATTERN)
  return <>{parts.map((part, index) => FILE_PART.test(part)
    ? <button className="kd-file-link" key={index} onClick={() => { onOpenFile(part) }}>{part}</button>
    : <span key={index}>{part}</span>)}</>
}

function AttachmentImage({ adapter, sessionId, attachment, preferences }: {
  adapter: DshClientAdapter
  sessionId: string
  attachment: Record<string, unknown>
  preferences: DisplayPreferences
}) {
  const [source, setSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void adapter.attachmentDataUrl(sessionId, attachment).then(
      value => { if (!cancelled) setSource(value) },
      reason => { if (!cancelled) setError(errorMessage(reason)) },
    )
    return () => { cancelled = true }
  }, [adapter, sessionId, attachment])
  if (error !== null) return <div className="s7-inline-error">{error}</div>
  if (source === null) return <div className="kd-loading">Loading image…</div>
  return <AuthenticImage source={source} sourceIdentity={`${sessionId}:${String(attachment.id)}`} preferences={preferences} filter={false} alt="Agent attachment" />
}

function AssistantBlockView({ block, adapter, sessionId, preferences, renderMarkdown, onOpenFile }: {
  block: AssistantBlock
  adapter: DshClientAdapter
  sessionId: string
  preferences: DisplayPreferences
  renderMarkdown: boolean
  onOpenFile: (path: string) => void
}) {
  switch (block.kind) {
    case 'text': return renderMarkdown ? <MarkdownText text={block.text} onOpenFile={onOpenFile} /> : <div className="kd-message-text"><LinkedText text={block.text} onOpenFile={onOpenFile} /></div>
    case 'reasoning': return <details className="kd-reasoning"><summary>Reasoning / thinking</summary><pre>{pixelizeEmoji(block.text)}</pre></details>
    case 'image': return <AttachmentImage adapter={adapter} sessionId={sessionId} attachment={block.attachment as unknown as Record<string, unknown>} preferences={preferences} />
    case 'tool-call': return <details className="kd-tool"><summary>Tool call: {block.name}</summary><pre>{pixelizeEmoji(block.argsRaw)}</pre></details>
    case 'other': return <details className="kd-tool"><summary>Additional output</summary><pre>{pixelizeEmoji(JSON.stringify(block.block, null, 2))}</pre></details>
  }
}

function ScrapbookAction({ onAdd }: { onAdd: () => void }) {
  const [added, setAdded] = useState(false)
  return <button className="kd-mini-action kd-scrapbook-link" data-visited={added || undefined} aria-live="polite" onClick={() => { onAdd(); setAdded(true) }}>{added ? 'Added to Scrapbook' : 'Add to Scrapbook'}</button>
}

function NodeView({ node, adapter, sessionId, preferences, renderMarkdown, onOpenFile, onAddScrap }: {
  node: ConversationNode
  adapter: DshClientAdapter
  sessionId: string
  preferences: DisplayPreferences
  renderMarkdown: boolean
  onOpenFile: (path: string) => void
  onAddScrap: (title: string, body: string, kind?: 'text' | 'code' | 'reference') => void
}) {
  if (node.kind === 'assistant') {
    const body = node.blocks.map(block => block.kind === 'text' || block.kind === 'reasoning' ? block.text : `[${block.kind}]`).join('\n')
    return <article className="kd-message kd-message-assistant">
      <header><span className="kd-role">AGENT</span><time>{formatTime(node.time)}</time><span className="kd-spacer" />
        <ScrapbookAction onAdd={() => { onAddScrap('Agent note', body) }} /></header>
      {node.blocks.map((block, index) => <AssistantBlockView key={index} block={block} adapter={adapter} sessionId={sessionId} preferences={preferences} renderMarkdown={renderMarkdown} onOpenFile={onOpenFile} />)}
      {node.interrupted ? <div className="kd-notice">Stopped before completion.</div> : null}
    </article>
  }
  if (node.kind === 'user' || node.kind === 'steering') {
    const body = textOfContent(node.content)
    return <article className="kd-message kd-message-user"><header><span className="kd-role">{node.kind === 'steering' ? 'STEER' : 'YOU'}</span><time>{formatTime(node.time)}</time><span className="kd-spacer" />
      <ScrapbookAction onAdd={() => { onAddScrap('User note', body) }} /></header><div className="kd-message-text"><LinkedText text={body} onOpenFile={onOpenFile} /></div></article>
  }
  if (node.kind === 'tool-result') {
    const body = textOfContent(node.content)
    return <article className={`kd-message kd-message-tool ${node.isError ? 'kd-message-error' : ''}`}><header><span className="kd-role">TOOL</span><time>{formatTime(node.time)}</time></header>
      <details open={node.isError}><summary>{node.call?.name ?? node.callId} — {node.isError ? 'error' : 'result'}</summary><pre>{pixelizeEmoji(body)}</pre></details></article>
  }
  if (node.kind === 'context') return <details className="kd-message kd-message-context"><summary>Context · {node.provenance.label ?? node.provenance.role}</summary><pre>{pixelizeEmoji(textOfContent(node.content))}</pre></details>
  if (node.kind === 'turn-error') return <div className="kd-message kd-message-error">Error {node.code ?? ''}: {pixelizeEmoji(node.message)}</div>
  if (node.kind === 'turn-max-tokens') return <div className="kd-notice">The model reached its output-token limit.</div>
  if (node.kind === 'model-retry') return <div className="kd-notice">Model retry: {node.retryState}</div>
  if (node.kind === 'compaction') return <details className="kd-message"><summary>History compacted · {node.shadowedItemCount ?? '?'} items</summary><pre>{pixelizeEmoji(node.summary ?? 'Summary is outside the loaded history window.')}</pre></details>
  if (node.kind === 'command') return <div className="kd-message kd-message-tool">Command /{node.name ?? '?'} {pixelizeEmoji(node.args ?? '')} — {node.outcome?.kind ?? 'running'}</div>
  return <details className="kd-message"><summary>Event {node.kind}</summary><pre>{pixelizeEmoji(JSON.stringify(node, null, 2))}</pre></details>
}

const ConversationBody = memo(function ConversationBody({ snapshot, adapter, sessionId, preferences, renderMarkdown, onOpenFile, onAddScrap }: {
  snapshot: ConversationSnapshot
  adapter: DshClientAdapter
  sessionId: string
  preferences: DisplayPreferences
  renderMarkdown: boolean
  onOpenFile: (path: string) => void
  onAddScrap: (title: string, body: string, kind?: 'text' | 'code' | 'reference') => void
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastOutputVersion = useRef<string | null>(null)
  const followingRef = useRef(true)
  const [following, setFollowing] = useState(true)
  const [newOutput, setNewOutput] = useState(false)
  const lastNode = snapshot.nodes.at(-1)
  const partialSize = snapshot.partial?.blocks.reduce((total, block) => total + (block.kind === 'text' || block.kind === 'reasoning' ? block.text.length : block.kind === 'tool-call' ? block.argsRaw.length : 1), 0) ?? 0
  const callsVersion = snapshot.runningCalls.map(call => `${call.callId}:${call.argsRaw.length}`).join(',')
  const outputVersion = `${lastNode?.seq ?? 'none'}:${snapshot.partial === null ? 'done' : partialSize}:${callsVersion}`
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (element === null) return
    if (lastOutputVersion.current === null || followingRef.current) {
      element.scrollTop = element.scrollHeight
      setNewOutput(false)
    } else if (lastOutputVersion.current !== outputVersion) setNewOutput(true)
    lastOutputVersion.current = outputVersion
  }, [outputVersion])
  const followLatest = () => {
    const element = scrollRef.current
    if (element !== null) element.scrollTop = element.scrollHeight
    followingRef.current = true
    setFollowing(true)
    setNewOutput(false)
  }
  return <div className="kd-conversation-shell">
    <div ref={scrollRef} className="kd-conversation kd-scroll" onScroll={event => {
      const next = isNearOutputEnd(event.currentTarget)
      if (next === followingRef.current) return
      followingRef.current = next
      setFollowing(next)
      if (next) setNewOutput(false)
    }}>
      {snapshot.hasMore ? <div className="kd-load-older"><SystemButton disabled={snapshot.loadingOlder} onClick={() => { void adapter.loadOlder(sessionId) }}>{snapshot.loadingOlder ? 'Loading…' : 'Load Earlier History'}</SystemButton></div> : null}
      {snapshot.openState === 'loading' ? <div className="kd-empty">Opening complete session history…</div> : null}
      {snapshot.openState === 'error' ? <div className="s7-inline-error">{snapshot.openError?.message ?? 'History failed to open.'}</div> : null}
      {snapshot.nodes.map(node => <NodeView key={`${node.kind}:${node.seq}`} node={node} adapter={adapter} sessionId={sessionId} preferences={preferences} renderMarkdown={renderMarkdown} onOpenFile={onOpenFile} onAddScrap={onAddScrap} />)}
      {snapshot.partial !== null ? <article className="kd-message kd-message-assistant kd-streaming"><header><span className="kd-role">AGENT</span><span>streaming…</span></header>{snapshot.partial.blocks.map((block, index) => <AssistantBlockView key={index} block={block} adapter={adapter} sessionId={sessionId} preferences={preferences} renderMarkdown={false} onOpenFile={onOpenFile} />)}</article> : null}
      {snapshot.runningCalls.map(call => <details className="kd-message kd-message-tool" open key={call.callId}><summary>Running tool: {call.name}</summary><pre>{pixelizeEmoji(call.argsRaw)}</pre></details>)}
    </div>
    {following ? null : <SystemButton className={`kd-follow-output ${newOutput ? 'kd-follow-output-new' : ''}`} onClick={followLatest}>{newOutput ? 'New output ↓' : 'Return to latest ↓'}</SystemButton>}
  </div>
})

function ContextInspector({ inspection, busy, notice, onCompact, onHandoff }: { inspection: ContextInspectionView | null; busy: boolean; notice: string | null; onCompact: () => void; onHandoff: () => void }) {
  const context = inspection?.context
  const pressure = context?.contextWindow === undefined ? undefined : context.contextTokens / context.contextWindow * 100
  return <aside className="kd-context-inspector">
    <header><strong>Context Inspector</strong><span>{pressure === undefined ? 'limit unknown' : `${pressure.toFixed(0)}% used`}</span></header>
    {pressure !== undefined && pressure >= 75 ? <div className={`kd-context-warning ${pressure >= 90 ? 'kd-context-critical' : ''}`}>{pressure >= 90 ? 'Critical context pressure. Compact or hand off now.' : 'Context is getting full; consider a checkpoint.'}</div> : null}
    <p className="kd-muted">Token length is provider-reported. Shares below estimate text characters on the effective event surface and are not token accounting.</p>
    <div className="kd-context-bars">{inspection?.breakdown.map(item => <section key={item.kind}><span>{item.label}</span><strong>{item.percent.toFixed(0)}%</strong><i><b style={{ width: `${item.percent}%` }} /></i><small>{item.characters.toLocaleString()} chars · {item.eventCount} events</small></section>)}</div>
    {inspection?.latestSummary === undefined ? <p className="kd-muted">No compaction summary is currently exposed.</p> : <details><summary>Latest handoff summary · event #{inspection.latestSummarySeq}</summary><pre>{inspection.latestSummary}</pre></details>}
    {notice === null ? null : <div className="kd-settings-notice" role="status">{notice}</div>}
    <div className="kd-context-actions"><SystemButton disabled={busy} onClick={onCompact}>Compact Now</SystemButton><SystemButton disabled={busy} onClick={onHandoff}>New Agent with Current Summary</SystemButton></div>
  </aside>
}

function AgentActionsInspector({ running, renderMarkdown, onRenderMarkdownChange, onRename, onExport, onArchive, onDesktop, onStop }: {
  running: boolean
  renderMarkdown: boolean
  onRenderMarkdownChange: (enabled: boolean) => void
  onRename: () => void
  onExport: () => void
  onArchive: () => void
  onDesktop: () => void
  onStop: () => void
}) {
  return <aside className="kd-agent-actions-inspector">
    <header><strong>Agent</strong><span>Other</span></header>
    <SystemCheckbox checked={renderMarkdown} onChange={event => { onRenderMarkdownChange(event.currentTarget.checked) }} label="Render final Markdown" />
    <p className="kd-muted">Completed Agent text can render headings, emphasis, lists, code, quotes, and tables. Streaming text stays plain until complete.</p>
    <div className="kd-agent-action-stack">
      <SystemButton onClick={onRename}>Rename…</SystemButton>
      <SystemButton onClick={onExport}>Export…</SystemButton>
      <SystemButton disabled={running} onClick={onArchive}>Archive…</SystemButton>
      <SystemButton onClick={onDesktop}>Add to Desktop</SystemButton>
      {running ? <SystemButton onClick={onStop}>Stop Running Agent</SystemButton> : null}
    </div>
  </aside>
}

function BoundKnowledgeDesk({ adapter, sessionId, sessions, preferences, renderMarkdown, onRenderMarkdownChange, onOpenTimeline, onOpenFile, onAddScrap, onArchiveSession, onRenameSession, onExportSession, onCreateHandoff, onAddDesktopItem }: KnowledgeDeskAppProps & { sessionId: string }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [sidePanel, setSidePanel] = useState<'context' | 'other' | null>(null)
  const [contextBusy, setContextBusy] = useState(false)
  const [contextNotice, setContextNotice] = useState<string | null>(null)
  const [inspection, setInspection] = useState<ContextInspectionView | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const sessionRow = sessions.find(session => session.id === sessionId)
  const [renameDraft, setRenameDraft] = useState(sessionRow?.title ?? '')
  const contextPressure = inspection?.context?.contextWindow === undefined ? undefined : inspection.context.contextTokens / inspection.context.contextWindow * 100
  useEffect(() => {
    let cancelled = false
    const load = () => { void adapter.rpc<ContextInspectionView>('session/context', { sessionId }).then(value => { if (!cancelled) setInspection(value) }, () => { if (!cancelled) setInspection(null) }) }
    load()
    const timer = window.setInterval(load, 1500)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [adapter, sessionId])
  const compact = async () => {
    setContextBusy(true); setContextNotice(null); setError(null)
    try { await adapter.command(sessionId, '/compact'); setContextNotice('DSH accepted the compaction request. The summary will appear when it finishes.') }
    catch (reason) { setError(errorMessage(reason)) } finally { setContextBusy(false) }
  }
  const handoff = async () => {
    setContextBusy(true); setContextNotice('Creating a fresh current summary…'); setError(null)
    const previousSeq = inspection?.latestSummarySeq ?? -1
    try {
      await adapter.command(sessionId, '/compact')
      let summary: string | undefined
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise(resolve => { window.setTimeout(resolve, 500) })
        const next = await adapter.rpc<ContextInspectionView>('session/context', { sessionId })
        setInspection(next)
        if (next.latestSummary !== undefined && (next.latestSummarySeq ?? -1) > previousSeq) { summary = next.latestSummary; break }
      }
      if (summary === undefined) throw new Error('DSH did not expose a new compaction summary within one minute.')
      await onCreateHandoff(sessionId, summary)
      setContextNotice('A new Agent was created with the current summary.')
    } catch (reason) { setError(errorMessage(reason)); setContextNotice(null) } finally { setContextBusy(false) }
  }
  return <SessionSnapshot adapter={adapter} sessionId={sessionId} unavailable={<div className="kd-empty">This DSH session is no longer live. It remains available from the session browser if DSH can resume it.</div>}>
    {snapshot => {
      const send = async () => {
        const text = draft.trim()
        if (text === '') return
        setSending(true); setError(null)
        try {
          await adapter.prompt(sessionId, text, snapshot.running ? 'steer' : 'queue')
          setDraft('')
        } catch (reason) { setError(errorMessage(reason)) } finally { setSending(false) }
      }
      return <>
        <div className="kd-agent-toolbar"><span className={`kd-led ${snapshot.running ? 'kd-led-running' : ''}`} />
          <strong>{snapshot.running ? 'RUNNING' : 'IDLE'}</strong><span className="kd-spacer" />
          <SystemButton data-pressed={sidePanel === 'context' || undefined} className={contextPressure !== undefined && contextPressure >= 90 ? 'kd-context-button-critical' : ''} title={formatContextUsage(inspection?.context) === undefined ? 'Context capacity has not been reported yet.' : `Context ${formatContextUsage(inspection?.context)}`} onClick={() => { setSidePanel(value => value === 'context' ? null : 'context') }}>{contextPressure === undefined ? 'Context' : `Context ${contextPressure.toFixed(0)}%`}</SystemButton>
          <SystemButton onClick={() => { onOpenTimeline(sessionId) }}>Timeline</SystemButton>
          <SystemButton data-pressed={sidePanel === 'other' || undefined} onClick={() => { setSidePanel(value => value === 'other' ? null : 'other') }}>Other…</SystemButton>
        </div>
        <div className="kd-agent-main" data-side-panel={sidePanel ?? undefined}><ConversationBody snapshot={snapshot} adapter={adapter} sessionId={sessionId} preferences={preferences} renderMarkdown={renderMarkdown}
            onOpenFile={path => { onOpenFile(sessionId, path) }}
            onAddScrap={(title, body, kind = 'text') => { onAddScrap({ title, body, kind, sessionId }) }} />
          {sidePanel === 'context' ? <ContextInspector inspection={inspection} busy={contextBusy} notice={contextNotice} onCompact={() => { void compact() }} onHandoff={() => { void handoff() }} /> : null}
          {sidePanel === 'other' ? <AgentActionsInspector running={snapshot.running} renderMarkdown={renderMarkdown} onRenderMarkdownChange={onRenderMarkdownChange}
            onRename={() => { setRenameDraft(sessionRow?.title ?? ''); setRenameOpen(true) }} onExport={() => { setExportOpen(true) }} onArchive={() => { setConfirmArchive(true) }}
            onDesktop={() => { onAddDesktopItem({ kind: 'agent', label: sessionRow?.title ?? `Agent ${sessionId.slice(-8)}`, sessionId, ...(sessionRow?.cwd === undefined ? {} : { cwd: sessionRow.cwd }) }) }}
            onStop={() => { void adapter.cancel(sessionId) }} /> : null}</div>
        {error === null && snapshot.promptError === null ? null : <div className="kd-composer-error">{error ?? snapshot.promptError?.error.message}</div>}
        <form className="kd-composer" data-drop-target="agent" onDragOver={event => { if (event.dataTransfer.types.includes('application/x-s7r-desktop-item')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={event => {
          const item = readDragItem(event.dataTransfer); if (item === null) return
          event.preventDefault(); event.stopPropagation()
          const reference = item.kind === 'path' ? relativePathReference(item.path, sessionRow?.cwd) : item.kind === 'agent' ? `[Agent ${item.label}: ${item.sessionId}]` : item.kind === 'workspace' ? item.path : `[Scrapbook: ${item.label}]`
          setDraft(current => current === '' ? reference : `${current}\n${reference}`)
        }} onSubmit={event => { event.preventDefault(); void send() }}>
          <SystemTextArea value={draft} onChange={event => { setDraft(event.currentTarget.value) }} rows={3} disabled={snapshot.removed || sending}
            placeholder={snapshot.running ? 'Send steering for the next step…' : 'Message this agent…'}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} />
          <SystemButton type="submit" disabled={draft.trim() === '' || sending || snapshot.removed}>{snapshot.running ? 'Steer' : 'Send'}</SystemButton>
        </form>
        <SystemStatusBar>{sessionRow?.workspaceTitle ?? 'Unknown Workspace'} · {formatContextUsage(inspection?.context) === undefined ? '' : `Context ${formatContextUsage(inspection?.context)} · `}{snapshot.nodes.length} records · ID {sessionId.slice(-8)}</SystemStatusBar>
        {confirmArchive ? <SystemDialog title="Archive Agent" onClose={() => { if (!sending) setConfirmArchive(false) }}><p>Hide this Agent and conversation in S7R’s reversible archive?</p><p className="kd-muted">The DSH session and log remain unchanged. You can restore it later from Knowledge Desk.</p><div className="kd-dialog-actions"><SystemButton disabled={sending} onClick={() => { setConfirmArchive(false) }}>Cancel</SystemButton><SystemButton disabled={sending} onClick={() => { setSending(true); setError(null); void onArchiveSession(sessionId).catch(reason => { setSending(false); setError(errorMessage(reason)); setConfirmArchive(false) }) }}>Archive</SystemButton></div></SystemDialog> : null}
        {renameOpen ? <SystemDialog title="Rename Agent" onClose={() => { setRenameOpen(false) }}><label htmlFor="kd-agent-rename">Agent name</label><SystemInput id="kd-agent-rename" value={renameDraft} onChange={event => { setRenameDraft(event.currentTarget.value) }} autoFocus /><div className="kd-dialog-actions"><SystemButton onClick={() => { setRenameOpen(false) }}>Cancel</SystemButton><SystemButton disabled={renameDraft.trim() === ''} onClick={() => { void onRenameSession(sessionId, renameDraft).then(() => { setRenameOpen(false) }, reason => { setError(errorMessage(reason)); setRenameOpen(false) }) }}>Rename</SystemButton></div></SystemDialog> : null}
        {exportOpen ? <SystemDialog title="Export Agent" onClose={() => { setExportOpen(false) }}><p>Export the complete persisted event history, including records outside the currently loaded page.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setExportOpen(false) }}>Cancel</SystemButton><SystemButton onClick={() => { void onExportSession(sessionId, 'json', sessionRow?.title ?? `Agent ${sessionId.slice(-8)}`).then(() => { setExportOpen(false) }, reason => { setError(errorMessage(reason)); setExportOpen(false) }) }}>JSON</SystemButton><SystemButton onClick={() => { void onExportSession(sessionId, 'markdown', sessionRow?.title ?? `Agent ${sessionId.slice(-8)}`).then(() => { setExportOpen(false) }, reason => { setError(errorMessage(reason)); setExportOpen(false) }) }}>Markdown</SystemButton></div></SystemDialog> : null}
      </>
    }}
  </SessionSnapshot>
}

function SessionPicker(props: KnowledgeDeskAppProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(props.sessions[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'current' | 'all'>('current')
  const [status, setStatus] = useState<'all' | 'running' | 'idle' | 'done'>('all')
  const [sort, setSort] = useState<'recent' | 'name' | 'status'>('recent')
  const [pendingArchive, setPendingArchive] = useState<string | null>(null)
  const [pendingRename, setPendingRename] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [pendingExport, setPendingExport] = useState<string | null>(null)
  useEffect(() => {
    if (selectedSession !== null && !props.sessions.some(session => session.id === selectedSession)) setSelectedSession(props.sessions[0]?.id ?? null)
  }, [props.sessions, selectedSession])
  const run = async (operation: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError(null)
    try { await operation() } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const currentWorkspace = props.workspaces.find(workspace => workspace.id === props.currentWorkspaceId)
  const queryLower = query.toLocaleLowerCase()
  const filteredSessions = props.sessions
    .filter(session => scope === 'all' || currentWorkspace === undefined || session.workspaceId === currentWorkspace.id)
    .filter(session => `${session.title}\n${session.cwd ?? ''}\n${session.id}`.toLocaleLowerCase().includes(queryLower))
    .filter(session => status === 'all' || (status === 'running' ? session.running : status === 'done' ? session.completed === true : !session.running && session.completed !== true))
    .sort((left, right) => sort === 'name'
      ? left.title.localeCompare(right.title)
      : sort === 'status'
        ? Number(right.running) - Number(left.running) || Number(right.completed === true) - Number(left.completed === true) || right.updatedAt - left.updatedAt
        : right.updatedAt - left.updatedAt)
  const workspaceForArchive = (cwd: string | undefined) => cwd === undefined ? undefined : props.workspaces.find(workspace => cwd === workspace.path || cwd.startsWith(`${workspace.path.replace(/[\\/]+$/, '')}/`))
  const filteredArchived = props.archivedAgents
    .filter(session => scope === 'all' || currentWorkspace === undefined || workspaceForArchive(session.cwd)?.id === currentWorkspace.id)
    .filter(session => `${session.title}\n${session.cwd ?? ''}\n${session.sessionId}`.toLocaleLowerCase().includes(queryLower))
    .sort((left, right) => right.archivedAt - left.archivedAt)
  const activeGroups = scope === 'current' && currentWorkspace !== undefined
    ? [{ id: currentWorkspace.id, title: currentWorkspace.title, sessions: filteredSessions }]
    : [...props.workspaces.map(workspace => ({ id: workspace.id, title: workspace.title, sessions: filteredSessions.filter(session => session.workspaceId === workspace.id) })), { id: 'unassigned', title: 'Other / Unassigned', sessions: filteredSessions.filter(session => session.workspaceId === undefined || !props.workspaces.some(workspace => workspace.id === session.workspaceId)) }].filter(group => group.sessions.length > 0)
  const selectedRow = props.sessions.find(session => session.id === selectedSession)
  useEffect(() => {
    if (selectedSession !== null && !filteredSessions.some(session => session.id === selectedSession)) setSelectedSession(filteredSessions[0]?.id ?? null)
  }, [filteredSessions, selectedSession])
  return <div className="kd-session-picker">
    <section className="kd-launcher-top">
      <div className="kd-welcome-mark">KD</div>
      <div className="kd-current-workspace"><small>{currentWorkspace === undefined ? 'NO CURRENT WORKSPACE' : 'CURRENT WORKSPACE'}</small><h2>{currentWorkspace?.title ?? 'Choose a Folder First'}</h2><p title={currentWorkspace?.path}>{currentWorkspace?.path ?? 'A folder becomes the filesystem boundary for its Agents, Finder, and Terminal.'}</p></div>
      <SystemButton disabled={busy} onClick={() => { void run(props.onChooseFolder) }}>Choose Folder…</SystemButton>
      <SystemButton onClick={props.onOpenSettings}>API Key Settings…</SystemButton>
    </section>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <div className="kd-launcher-columns">
      <section className="kd-launcher-pane"><header><strong>Workspaces</strong><span className="kd-spacer" /><SystemButton disabled={busy || currentWorkspace === undefined} title={currentWorkspace === undefined ? 'Choose a Workspace first.' : `Create in ${currentWorkspace.title}`} onClick={() => { void run(async () => { await props.onNewSession(currentWorkspace?.id) }) }}>New Agent Here</SystemButton></header>
        <ul className="kd-list kd-scroll">{props.workspaces.map(workspace => <li draggable onDragStart={event => { writeDragItem(event.dataTransfer, { kind: 'workspace', label: workspace.title, workspaceId: workspace.id, path: workspace.path }) }} className="kd-list-row kd-workspace-row" data-selected={currentWorkspace?.id === workspace.id || undefined} key={workspace.id} onClick={() => { props.onSelectWorkspace(workspace.id) }} onDoubleClick={() => { void run(async () => { await props.onOpenWorkspace(workspace.id) }) }}><span className="s7-app-icon s7-app-icon-folder" /><span><strong>{workspace.title}{currentWorkspace?.id === workspace.id ? ' · Current' : ''}</strong><small>{workspace.path} · {props.sessions.filter(session => session.workspaceId === workspace.id).length} Agents</small></span><span className="kd-spacer" /><SystemButton onClick={() => { props.onAddDesktopItem({ kind: 'workspace', label: workspace.title, workspaceId: workspace.id, path: workspace.path }) }}>Desktop</SystemButton><SystemButton disabled={busy} onClick={() => { void run(async () => { await props.onOpenWorkspace(workspace.id) }) }}>Open</SystemButton></li>)}
          {props.workspaces.length === 0 ? <li className="kd-empty">No folders registered yet.</li> : null}</ul>
      </section>
      <section className="kd-launcher-pane"><header><strong>Agents</strong><SystemButton data-pressed={view === 'active' || undefined} onClick={() => { setView('active') }}>Active</SystemButton><SystemButton data-pressed={view === 'archived' || undefined} onClick={() => { setView('archived') }}>Archived ({props.archivedAgents.length})</SystemButton><span className="kd-spacer" /></header>
        <div className="kd-agent-search"><SystemInput aria-label="Search Agents" value={query} placeholder="Search name, path, or ID…" onChange={event => { setQuery(event.currentTarget.value) }} /><SystemSelect aria-label="Workspace scope" value={scope} onChange={event => { setScope(event.currentTarget.value as 'current' | 'all') }}><option value="current">Current</option><option value="all">All Workspaces</option></SystemSelect><SystemSelect aria-label="Agent status" value={status} onChange={event => { setStatus(event.currentTarget.value as typeof status) }}><option value="all">All Status</option><option value="running">Running</option><option value="idle">Idle</option><option value="done">Completed</option></SystemSelect><SystemSelect aria-label="Agent sorting" value={sort} onChange={event => { setSort(event.currentTarget.value as typeof sort) }}><option value="recent">Recent</option><option value="name">Name</option><option value="status">Status</option></SystemSelect></div>
        {view === 'active' ? <><ul className="kd-list kd-scroll">{activeGroups.map(group => <Fragment key={group.id}><li className="kd-list-heading"><span>{group.title}</span><small>{group.sessions.length}</small></li>{group.sessions.map(session => <li draggable onDragStart={event => { writeDragItem(event.dataTransfer, { kind: 'agent', label: session.title, sessionId: session.id, ...(session.cwd === undefined ? {} : { cwd: session.cwd }) }) }} className="kd-list-row kd-agent-row" key={session.id} data-selected={selectedSession === session.id} onClick={() => { setSelectedSession(session.id) }} onDoubleClick={() => { props.onOpenSession(session.id) }}><span className={`kd-led ${session.running ? 'kd-led-running' : ''}`} /><span><strong>{session.title}</strong><small>{session.running ? 'Running' : session.completed ? 'Completed' : 'Idle'} · {session.updatedAt > 0 ? new Date(session.updatedAt).toLocaleString() : session.id.slice(0, 10)}</small></span></li>)}</Fragment>)}
          {filteredSessions.length === 0 ? <li className="kd-empty">No matching active Agents.</li> : null}</ul><div className="kd-launcher-actions"><SystemButton disabled={selectedRow === undefined} onClick={() => { if (selectedRow !== undefined) props.onAddDesktopItem({ kind: 'agent', label: selectedRow.title, sessionId: selectedRow.id, ...(selectedRow.cwd === undefined ? {} : { cwd: selectedRow.cwd }) }) }}>Desktop</SystemButton><SystemButton disabled={selectedRow === undefined} onClick={() => { if (selectedRow !== undefined) { setRenameDraft(selectedRow.title); setPendingRename(selectedRow.id) } }}>Rename…</SystemButton><SystemButton disabled={selectedRow === undefined} onClick={() => { if (selectedRow !== undefined) setPendingExport(selectedRow.id) }}>Export…</SystemButton><SystemButton disabled={selectedRow === undefined || selectedRow.running || busy} onClick={() => { if (selectedRow !== undefined) setPendingArchive(selectedRow.id) }}>Archive…</SystemButton><SystemButton disabled={selectedRow === undefined} onClick={() => { if (selectedRow !== undefined) props.onOpenSession(selectedRow.id) }}>Open</SystemButton></div></>
          : <><ul className="kd-list kd-scroll">{filteredArchived.map(session => <li className="kd-list-row" key={session.sessionId}><span className="kd-led" /><span><strong>{session.title}</strong><small>{session.cwd ?? session.sessionId.slice(0, 10)} · {new Date(session.archivedAt).toLocaleDateString()}</small></span><span className="kd-spacer" /><SystemButton onClick={() => { props.onRestoreSession(session.sessionId) }}>Restore</SystemButton><SystemButton onClick={() => { setPendingExport(session.sessionId) }}>Export…</SystemButton></li>)}{filteredArchived.length === 0 ? <li className="kd-empty">No matching archived Agents.</li> : null}</ul>{props.upstreamArchivedIds.length === 0 ? null : <p className="kd-upstream-archive">{props.upstreamArchivedIds.length} older DSH-native archive entries are retained upstream. rc.7 exposes no restore operation for them.</p>}</>}
      </section>
    </div>
    {pendingArchive === null ? null : <SystemDialog title="Archive Agent" onClose={() => { if (!busy) setPendingArchive(null) }}><p>Move “{props.sessions.find(session => session.id === pendingArchive)?.title ?? pendingArchive}” to S7R’s reversible archive?</p><div className="kd-dialog-actions"><SystemButton disabled={busy} onClick={() => { setPendingArchive(null) }}>Cancel</SystemButton><SystemButton disabled={busy} onClick={() => { const id = pendingArchive; void run(async () => { await props.onArchiveSession(id); setPendingArchive(null) }) }}>Archive</SystemButton></div></SystemDialog>}
    {pendingRename === null ? null : <SystemDialog title="Rename Agent" onClose={() => { setPendingRename(null) }}><SystemInput aria-label="Agent name" value={renameDraft} onChange={event => { setRenameDraft(event.currentTarget.value) }} autoFocus /><div className="kd-dialog-actions"><SystemButton onClick={() => { setPendingRename(null) }}>Cancel</SystemButton><SystemButton disabled={renameDraft.trim() === '' || busy} onClick={() => { const id = pendingRename; void run(async () => { await props.onRenameSession(id, renameDraft); setPendingRename(null) }) }}>Rename</SystemButton></div></SystemDialog>}
    {pendingExport === null ? null : <SystemDialog title="Export Agent" onClose={() => { setPendingExport(null) }}><p>Export the complete persisted event history, not only the visible page.</p><div className="kd-dialog-actions"><SystemButton onClick={() => { setPendingExport(null) }}>Cancel</SystemButton><SystemButton onClick={() => { const row = props.sessions.find(item => item.id === pendingExport); const archived = props.archivedAgents.find(item => item.sessionId === pendingExport); void props.onExportSession(pendingExport, 'json', row?.title ?? archived?.title ?? 'Agent').then(() => { setPendingExport(null) }) }}>JSON</SystemButton><SystemButton onClick={() => { const row = props.sessions.find(item => item.id === pendingExport); const archived = props.archivedAgents.find(item => item.sessionId === pendingExport); void props.onExportSession(pendingExport, 'markdown', row?.title ?? archived?.title ?? 'Agent').then(() => { setPendingExport(null) }) }}>Markdown</SystemButton></div></SystemDialog>}
  </div>
}

export function KnowledgeDeskApp(props: KnowledgeDeskAppProps) {
  if (props.sessionId === undefined) return <SessionPicker {...props} />
  return <BoundKnowledgeDesk {...props} sessionId={props.sessionId} />
}
