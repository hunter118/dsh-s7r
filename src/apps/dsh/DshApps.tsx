import { useEffect, useMemo, useState } from 'react'
import type { ModelSelection, SessionModels, SkillEntry } from '@deepseek-ai/dsh-client-connection/client'
import type { AgentPresetView, DshClientAdapter, NativeCommandView, NativeSessionView, PluginInventoryEntryView } from '../../dsh-compat/client.ts'
import { SystemButton, SystemInput, SystemPanel, SystemSelect, SystemStatusBar, SystemTextArea } from '../../system7/primitives.tsx'
import { errorMessage } from '../common.tsx'

export interface NativeAgentRow {
  id: string
  title: string
  cwd?: string
  workspaceId?: string
}

export interface NativeWorkspaceRow {
  id: string
  title: string
  path: string
}

function presetLabel(preset: AgentPresetView): string {
  return `${preset.name ?? preset.id}${preset.isDefault ? ' (Default)' : ''}${preset.trust === 'user' ? ' [Local]' : ''}`
}

export function StationeryPadApp({ adapter, workspaces, currentWorkspaceId, onChooseFolder, onCreated }: {
  adapter: DshClientAdapter
  workspaces: readonly NativeWorkspaceRow[]
  currentWorkspaceId?: string | undefined
  onChooseFolder: () => Promise<void>
  onCreated: (sessionId: string) => void
}) {
  const [presets, setPresets] = useState<AgentPresetView[]>([])
  const [preset, setPreset] = useState('')
  const [workspaceId, setWorkspaceId] = useState(currentWorkspaceId ?? '')
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void adapter.listAgentPresets().then(value => {
      if (cancelled) return
      const usable = value.filter(item => item.broken === undefined)
      setPresets(value)
      setPreset(current => current || usable.find(item => item.isDefault)?.id || usable[0]?.id || '')
    }, reason => { if (!cancelled) setError(errorMessage(reason)) })
    return () => { cancelled = true }
  }, [adapter])
  useEffect(() => { if (workspaceId === '' && currentWorkspaceId !== undefined) setWorkspaceId(currentWorkspaceId) }, [currentWorkspaceId, workspaceId])
  const selectedPreset = presets.find(item => item.id === preset)
  const create = async () => {
    if (preset === '' || workspaceId === '') return
    setBusy(true); setError(null); setNotice(null)
    try {
      const created = await adapter.newSessionFromPreset({ workspaceId, agentPreset: preset })
      if (title.trim() !== '') await adapter.renameSession(created.sessionId, title.trim())
      if (prompt.trim() !== '') await adapter.prompt(created.sessionId, prompt.trim(), 'queue')
      setNotice(`Created from ${selectedPreset?.name ?? preset}.`)
      onCreated(created.sessionId)
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  return <div className="kd-stationery">
    <div className="kd-stationery-banner"><span className="kd-stationery-sheet" aria-hidden="true">AP</span><div><h2>DSH Agent Preset Stationery</h2><p>Create a fresh Agent with a real DSH composition. The Preset decides its model-facing plugins and tools.</p></div></div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <SystemPanel title="Stationery">
      <div className="kd-form-grid">
        <label htmlFor="kd-stationery-workspace">Workspace</label><SystemSelect id="kd-stationery-workspace" data-balloon="The DSH Workspace that will own this Agent" value={workspaceId} onChange={event => { setWorkspaceId(event.currentTarget.value) }}><option value="">Choose a folder…</option>{workspaces.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</SystemSelect>
        <label htmlFor="kd-stationery-preset">Agent Preset</label><SystemSelect id="kd-stationery-preset" data-balloon="Choose an installed DSH Agent composition" value={preset} onChange={event => { setPreset(event.currentTarget.value) }}><option value="">No usable Preset</option>{presets.map(item => <option key={item.id} value={item.id} disabled={item.broken !== undefined}>{presetLabel(item)}{item.broken === undefined ? '' : ' — Broken'}</option>)}</SystemSelect>
        <label htmlFor="kd-stationery-title">Agent name</label><SystemInput id="kd-stationery-title" value={title} placeholder="Optional" onChange={event => { setTitle(event.currentTarget.value) }} />
      </div>
      {selectedPreset === undefined ? null : <div className="kd-native-description"><strong>{selectedPreset.name ?? selectedPreset.id}</strong><span>{selectedPreset.description ?? 'This Preset supplies no description.'}</span><small>{selectedPreset.trust === 'system' ? 'Shipped by this DSH deployment' : 'Locally authored Preset'}</small></div>}
      <label htmlFor="kd-stationery-prompt">Opening prompt (optional)</label>
      <SystemTextArea id="kd-stationery-prompt" rows={5} value={prompt} placeholder="The first task to send after creation…" onChange={event => { setPrompt(event.currentTarget.value) }} />
      {notice === null ? null : <div className="kd-settings-notice" role="status">{notice}</div>}
      <div className="kd-dialog-actions"><SystemButton disabled={busy} data-balloon="Register another folder as a DSH Workspace" onClick={() => { void onChooseFolder() }}>Choose Folder…</SystemButton><SystemButton disabled={busy || preset === '' || workspaceId === ''} data-balloon="Create a real DSH Agent from this Preset" onClick={() => { void create() }}>{busy ? 'Creating…' : 'Create Agent'}</SystemButton></div>
    </SystemPanel>
    <SystemStatusBar>{presets.filter(item => item.broken === undefined).length} usable DSH Agent Presets · no S7R-only composition is created</SystemStatusBar>
  </div>
}

type ControlTab = 'agent' | 'commands' | 'skills' | 'plugins'

export function DshControlApp({ adapter, agents, initialSessionId, onOpenAgent }: {
  adapter: DshClientAdapter
  agents: readonly NativeAgentRow[]
  initialSessionId?: string | undefined
  onOpenAgent: (sessionId: string) => void
}) {
  const [sessionId, setSessionId] = useState(initialSessionId ?? agents[0]?.id ?? '')
  const [tab, setTab] = useState<ControlTab>('agent')
  const [nativeSession, setNativeSession] = useState<NativeSessionView | null>(null)
  const [presets, setPresets] = useState<AgentPresetView[]>([])
  const [models, setModels] = useState<SessionModels | null>(null)
  const [selection, setSelection] = useState<ModelSelection | null>(null)
  const [commands, setCommands] = useState<readonly NativeCommandView[]>([])
  const [skills, setSkills] = useState<readonly SkillEntry[]>([])
  const [plugins, setPlugins] = useState<readonly PluginInventoryEntryView[]>([])
  const [pluginQuery, setPluginQuery] = useState('')
  const [commandArgs, setCommandArgs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const selectedAgent = agents.find(agent => agent.id === sessionId)
  useEffect(() => { if (sessionId === '' && agents[0] !== undefined) setSessionId(agents[0].id) }, [agents, sessionId])
  const refresh = async () => {
    setError(null)
    const errors: string[] = []
    const [sessionResult, presetResult, pluginResult] = await Promise.allSettled([adapter.listNativeSessions(), adapter.listAgentPresets(), adapter.listPlugins()])
    if (sessionResult.status === 'fulfilled') setNativeSession(sessionResult.value.find(item => item.sessionId === sessionId) ?? null)
    else errors.push(`Sessions: ${errorMessage(sessionResult.reason)}`)
    if (presetResult.status === 'fulfilled') setPresets(presetResult.value)
    else errors.push(`Presets: ${errorMessage(presetResult.reason)}`)
    if (pluginResult.status === 'fulfilled') setPlugins(pluginResult.value)
    else errors.push(`Plugins: ${errorMessage(pluginResult.reason)}`)
    if (sessionId !== '') {
      try { await adapter.prepareSession(sessionId) } catch (reason) { errors.push(`Agent: ${errorMessage(reason)}`) }
      const [modelResult, commandResult, skillResult] = await Promise.allSettled([adapter.sessionModels(sessionId), adapter.listCommands(sessionId), adapter.listSkills(sessionId)])
      if (modelResult.status === 'fulfilled') { setModels(modelResult.value); setSelection(modelResult.value.current) }
      else { setModels(null); setSelection(null); errors.push(`Models: ${errorMessage(modelResult.reason)}`) }
      if (commandResult.status === 'fulfilled') setCommands(commandResult.value)
      else { setCommands([]); errors.push(`Commands: ${errorMessage(commandResult.reason)}`) }
      if (skillResult.status === 'fulfilled') setSkills(skillResult.value)
      else {
        setSkills([])
        const message = errorMessage(skillResult.reason)
        if (!/not found \(not attached\)/i.test(message)) errors.push(`Skills: ${message}`)
      }
    } else { setModels(null); setSelection(null); setCommands([]); setSkills([]) }
    setError(errors.length === 0 ? null : errors.join(' · '))
  }
  useEffect(() => { void refresh() }, [adapter, sessionId])
  const modelOptions = useMemo(() => models?.groups.flatMap(group => group.models.map(model => ({ provider: group.id, providerName: group.name, model }))) ?? [], [models])
  const exactModel = selection === null ? undefined : modelOptions.find(item => item.provider === selection.provider && item.model.id === selection.model)
  const applyModel = async () => {
    if (selection === null || sessionId === '') return
    setBusy(true); setError(null); setNotice(null)
    try { const accepted = await adapter.selectModel(sessionId, selection); setSelection(accepted); setNotice(`Model set to ${accepted.provider} / ${accepted.model}.`) }
    catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const changePreset = async (agentPreset: string) => {
    if (sessionId === '') return
    setBusy(true); setError(null); setNotice(null)
    try { const accepted = await adapter.selectAgentPreset(sessionId, agentPreset); setNativeSession(current => current === null ? null : { ...current, agentPreset: accepted }); setNotice(`Agent recomposed from ${accepted}.`) }
    catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const runCommand = async (command: NativeCommandView) => {
    setBusy(true); setError(null); setNotice(null)
    try { const args = commandArgs[command.name]?.trim() ?? ''; await adapter.command(sessionId, `/${command.name}${args === '' ? '' : ` ${args}`}`); setNotice(`/${command.name} was accepted by DSH.`) }
    catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const runSkill = async (skill: SkillEntry) => {
    setBusy(true); setError(null); setNotice(null)
    try { await adapter.prompt(sessionId, `/${skill.name}`, 'queue'); setNotice(`/${skill.name} was sent through the DSH skill invocation path.`) }
    catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  const filteredPlugins = plugins.filter(item => `${item.moduleName}\n${item.entryId}\n${item.fiberPhase ?? ''}`.toLocaleLowerCase().includes(pluginQuery.toLocaleLowerCase()))
  return <div className="kd-native-control">
    <div className="kd-toolbar"><strong>Agent</strong><SystemSelect aria-label="Controlled Agent" data-balloon="Choose which persisted Agent these native DSH controls inspect" value={sessionId} onChange={event => { setSessionId(event.currentTarget.value) }}><option value="">No Agent</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.title}</option>)}</SystemSelect><SystemButton disabled={sessionId === ''} data-balloon="Open this Agent conversation" onClick={() => { onOpenAgent(sessionId) }}>Open</SystemButton><span className="kd-spacer" /><SystemButton data-balloon="Reload all catalogs from DSH" onClick={() => { void refresh() }}>Refresh</SystemButton></div>
    <nav className="kd-native-tabs" aria-label="DSH controls">{(['agent', 'commands', 'skills', 'plugins'] as const).map(value => <SystemButton key={value} data-pressed={tab === value || undefined} data-balloon={value === 'agent' ? 'Provider model, reasoning, and Agent Preset' : value === 'commands' ? 'Slash commands and modes registered for this Agent' : value === 'skills' ? 'Project Skills exposed by DSH' : 'Authoritative read-only plugin loader inventory'} onClick={() => { setTab(value) }}>{value === 'agent' ? 'Model & Preset' : value === 'commands' ? 'Commands & Modes' : value === 'skills' ? 'Skills' : `Plugins (${plugins.length})`}</SystemButton>)}</nav>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}{notice === null ? null : <div className="kd-settings-notice" role="status">{notice}</div>}
    <div className="kd-native-body kd-scroll">
      {tab === 'agent' ? <><SystemPanel title="Model route"><div className="kd-form-grid"><label>Model</label><SystemSelect disabled={selection === null || busy} value={selection === null ? '' : `${selection.provider}\t${selection.model}`} onChange={event => { const [provider, model] = event.currentTarget.value.split('\t'); if (provider !== undefined && model !== undefined) setSelection({ provider, model }) }}><option value="">No model catalog</option>{modelOptions.map(item => <option key={`${item.provider}:${item.model.id}`} value={`${item.provider}\t${item.model.id}`}>{item.providerName} / {item.model.name}</option>)}</SystemSelect><label>Reasoning</label><SystemSelect disabled={selection === null || busy || exactModel?.model.reasoning === undefined} value={selection?.reasoningEffort ?? ''} onChange={event => { setSelection(current => current === null ? null : { provider: current.provider, model: current.model, ...(event.currentTarget.value === '' ? {} : { reasoningEffort: event.currentTarget.value }) }) }}><option value="">Provider default</option>{exactModel?.model.reasoning?.efforts.map(effort => <option key={effort.id} value={effort.id}>{effort.name}</option>)}</SystemSelect></div><p className="kd-muted">{models === null ? 'Reading the DSH model catalog…' : models.routable ? 'The selected provider route is live.' : 'The current provider route is not live.'}</p>{models?.failures.map(failure => <p className="s7-inline-error" key={failure.id}>{failure.name}: {failure.message}</p>)}<div className="kd-dialog-actions"><SystemButton disabled={selection === null || busy} onClick={() => { void applyModel() }}>Apply Model</SystemButton></div></SystemPanel>
        <SystemPanel title="Agent Preset"><div className="kd-form-grid"><label>Composition</label><SystemSelect disabled={nativeSession?.blank !== true || busy} value={nativeSession?.agentPreset ?? ''} onChange={event => { void changePreset(event.currentTarget.value) }}><option value="">Host composition</option>{presets.map(item => <option key={item.id} value={item.id} disabled={item.broken !== undefined}>{presetLabel(item)}</option>)}</SystemSelect></div><p className="kd-muted">{nativeSession?.blank === true ? 'This Agent is blank, so DSH permits recomposition.' : 'DSH locks the Agent Preset after the first turn so logged tools remain reproducible. Use Stationery Pad for a different composition.'}</p></SystemPanel></> : null}
      {tab === 'commands' ? <><p className="kd-muted">These are this Agent’s real DSH slash commands. Modes such as Plan appear here only when its Preset has registered them.</p><div className="kd-native-cards">{commands.map(command => <section key={command.name}><header><strong>/{command.name}</strong><SystemButton disabled={busy || sessionId === ''} onClick={() => { void runCommand(command) }}>Run</SystemButton></header><p>{command.description}</p>{command.input === undefined ? null : <SystemInput aria-label={`Arguments for ${command.name}`} placeholder={command.input.hint} value={commandArgs[command.name] ?? ''} onChange={event => { const value = event.currentTarget.value; setCommandArgs(current => ({ ...current, [command.name]: value })) }} />}</section>)}{commands.length === 0 ? <div className="kd-empty">No commands are registered for this Agent.</div> : null}</div></> : null}
      {tab === 'skills' ? <><p className="kd-muted">Invocation uses the same /skill path as DSH’s composer. “User only” means the skill is hidden from model self-invocation.</p><div className="kd-native-cards">{skills.map(skill => <section key={skill.name}><header><strong>/{skill.name}</strong><span className="kd-badge">{skill.modelInvocable ? 'Model + user' : 'User only'}</span><SystemButton disabled={busy || sessionId === ''} onClick={() => { void runSkill(skill) }}>Invoke</SystemButton></header><p>{skill.description}</p>{skill.whenToUse === undefined ? null : <small>{skill.whenToUse}</small>}</section>)}{skills.length === 0 ? <div className="kd-empty">No skills are visible for this project. A cold Agent may need to be opened before DSH attaches its project skill catalog.</div> : null}</div></> : null}
      {tab === 'plugins' ? <><div className="kd-native-plugin-head"><SystemInput aria-label="Search Plugins" placeholder="Search module, entry, or phase…" value={pluginQuery} onChange={event => { setPluginQuery(event.currentTarget.value) }} /><span>{plugins.filter(item => item.enabled).length} enabled · {plugins.filter(item => item.fiberPhase === 'active').length} active</span></div><p className="kd-muted">DSH exposes this inventory as read-only. S7R shows authoritative loader state and does not present switches that the runtime cannot safely commit.</p><ul className="kd-list kd-native-plugin-list">{filteredPlugins.map(item => <li className="kd-list-row" key={item.entryId}><span className={`kd-native-phase kd-native-phase-${item.fiberPhase ?? 'off'}`} aria-hidden="true" /><span><strong>{item.moduleName}</strong><small>{item.entryId} · {item.enabled ? 'enabled' : 'disabled'} · {item.fiberPhase ?? 'not mounted'}</small></span></li>)}{filteredPlugins.length === 0 ? <li className="kd-empty">No matching plugins.</li> : null}</ul></> : null}
    </div>
    <SystemStatusBar>{selectedAgent?.title ?? 'No Agent'} · native DSH data · {tab}</SystemStatusBar>
  </div>
}
