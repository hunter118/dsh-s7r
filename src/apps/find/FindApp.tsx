import { useMemo, useState } from 'react'
import type { DshClientAdapter } from '../../dsh-compat/client.ts'
import type { FindResponseView, FindResultView, FindTargetView } from '../../dsh-compat/protocol.ts'
import { SystemButton, SystemCheckbox, SystemInput, SystemRadio, SystemSelect, SystemStatusBar } from '../../system7/primitives.tsx'
import { errorMessage } from '../common.tsx'

export interface FindWorkspaceTarget extends FindTargetView {
  id: string
}

export function FindApp({ adapter, workspaces, sessionIds, agentTitles, currentSessionId, onOpenFile, onOpenFolder, onOpenAgent, onOpenTimeline }: {
  adapter: DshClientAdapter
  workspaces: readonly FindWorkspaceTarget[]
  sessionIds: readonly string[]
  agentTitles: Readonly<Record<string, string>>
  currentSessionId?: string
  onOpenFile: (sessionId: string, path: string) => void
  onOpenFolder: (sessionId: string, path: string) => void
  onOpenAgent: (sessionId: string) => void
  onOpenTimeline: (sessionId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [workspaceScope, setWorkspaceScope] = useState('all')
  const [fileNames, setFileNames] = useState(true)
  const [sourceContents, setSourceContents] = useState(false)
  const [agentScope, setAgentScope] = useState<'none' | 'messages' | 'all-events'>('messages')
  const [agentTarget, setAgentTarget] = useState<'current' | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<FindResponseView | null>(null)
  const targets = useMemo(() => workspaceScope === 'all' ? workspaces : workspaces.filter(item => item.id === workspaceScope), [workspaceScope, workspaces])
  const canSearch = query.trim() !== '' && (fileNames || sourceContents || agentScope !== 'none')
  const search = async () => {
    if (!canSearch || busy) return
    setBusy(true); setError(null)
    try {
      setResponse(await adapter.rpc<FindResponseView>('find/search', {
        query: query.trim(), targets: targets.map(({ sessionId, label }) => ({ sessionId, label })), sessionIds: agentTarget === 'current' && currentSessionId !== undefined ? [currentSessionId] : sessionIds,
        fileNames, sourceContents, agentMessages: agentScope === 'messages', agentEvents: agentScope === 'all-events',
      }))
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const open = (result: FindResultView) => {
    if (result.kind === 'file-name' || result.kind === 'source') { if (result.pathType === 'directory') onOpenFolder(result.sessionId, result.path); else onOpenFile(result.sessionId, result.path) }
    else if (result.kind === 'agent-event') onOpenTimeline(result.sessionId)
    else onOpenAgent(result.sessionId)
  }
  return <div className="kd-find-app">
    <form className="kd-find-query" onSubmit={event => { event.preventDefault(); void search() }}>
      <label htmlFor="kd-global-find"><strong>Find:</strong></label><SystemInput id="kd-global-find" autoFocus value={query} onChange={event => { setQuery(event.currentTarget.value) }} />
      <SystemButton type="submit" disabled={!canSearch || busy}>{busy ? 'Searching…' : 'Find'}</SystemButton>
    </form>
    <div className="kd-find-options">
      <fieldset><legend>Files</legend><SystemCheckbox checked={fileNames} onChange={event => { setFileNames(event.currentTarget.checked) }} label="File and folder names" /><SystemCheckbox checked={sourceContents} onChange={event => { setSourceContents(event.currentTarget.checked) }} label="Source/text contents" /><label htmlFor="kd-find-workspace">Folders:</label><SystemSelect id="kd-find-workspace" value={workspaceScope} onChange={event => { setWorkspaceScope(event.currentTarget.value) }}><option value="all">All registered workspaces</option>{workspaces.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</SystemSelect></fieldset>
      <fieldset><legend>Agents</legend><SystemRadio name="agent-find-scope" checked={agentScope === 'none'} onChange={() => { setAgentScope('none') }} label="Do not search Agents" /><SystemRadio name="agent-find-scope" checked={agentScope === 'messages'} onChange={() => { setAgentScope('messages') }} label="Conversation messages" /><SystemRadio name="agent-find-scope" checked={agentScope === 'all-events'} onChange={() => { setAgentScope('all-events') }} label="All event streams (tools/reasoning/context)" /><label htmlFor="kd-find-agent-target">Agents:</label><SystemSelect id="kd-find-agent-target" value={agentTarget} onChange={event => { setAgentTarget(event.currentTarget.value as 'current' | 'all') }}><option value="all">All Agents</option><option value="current" disabled={currentSessionId === undefined}>Current Agent</option></SystemSelect><p className="kd-muted">All event streams includes messages and searches the complete persisted event log.</p></fieldset>
    </div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <div className="kd-find-head"><span>Where</span><span>Kind</span><span>Match</span></div>
    <ol className="kd-find-results kd-scroll">{response?.results.map((result, index) => <li key={`${result.kind}:${'path' in result ? result.path : `${result.sessionId}:${result.eventSeq}`}:${index}`} onDoubleClick={() => { open(result) }}>
      <button onClick={() => { open(result) }}><strong>{result.kind === 'agent-message' || result.kind === 'agent-event' ? agentTitles[result.sessionId] ?? result.label : result.label}</strong><span>{result.kind === 'file-name' ? result.pathType === 'directory' ? 'folder name' : 'file name' : result.kind === 'source' ? `source${result.line === undefined ? '' : `:${result.line}`}` : result.kind === 'agent-message' ? 'message' : 'eventType' in result ? result.eventType : 'event'}</span><span>{result.snippet}</span></button>
    </li>)}{response !== null && response.results.length === 0 ? <li className="kd-empty">No matches.</li> : null}{response === null ? <li className="kd-empty">Choose the search depth above, then enter a phrase.</li> : null}</ol>
    <SystemStatusBar>{response === null ? `${workspaces.length} workspaces · ${sessionIds.length} Agents available` : `${response.results.length} matches · ${response.filesScanned} files · ${response.eventsScanned} events${response.truncated ? ' · result limit reached' : ''}`}{currentSessionId === undefined ? '' : ` · current ${currentSessionId.slice(-8)}`}</SystemStatusBar>
  </div>
}
