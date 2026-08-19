import type { ClientContext, ConversationSnapshot, IWorkspaces, SessionFace, SessionId, SessionRuntime } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle, CredentialView, ModelSelection, SessionModels, SkillEntry, WorkspaceId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import type { CompatRpcResult, SessionExportView } from './protocol.ts'
import { KNOWLEDGE_DESK_RPC_CHANNEL } from './protocol.ts'

export interface SessionHandle {
  id: string
  face: SessionFace
}

export interface AgentPresetView {
  id: string
  trust: 'system' | 'user'
  isDefault: boolean
  name?: string
  description?: string
  broken?: string
}

export interface NativeSessionView {
  sessionId: string
  blank: boolean
  running: boolean
  updatedAt: number
  cwd?: string
  agentPreset?: string
}

export interface NativeCommandView {
  name: string
  description: string
  input?: { hint: string }
}

export interface PluginInventoryEntryView {
  entryId: string
  moduleName: string
  enabled: boolean
  fiberPhase: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null
}

type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string; details?: object } }
interface NativeRemote {
  commands: {
    list: (sessionId: string) => Promise<RemoteResult<readonly NativeCommandView[]>>
  }
  pluginInventory: {
    list: () => Promise<RemoteResult<{ entries: readonly PluginInventoryEntryView[] }>>
  }
}

export class DshClientAdapter {
  private readonly connection: ConnectionHandle
  private readonly sessions: SessionRuntime
  private readonly workspaces: IWorkspaces
  private readonly remote: NativeRemote | undefined

  constructor(private readonly ctx: ClientContext) {
    this.connection = (ctx as unknown as { connection: ConnectionHandle }).connection
    this.sessions = ctx.sessions as SessionRuntime
    this.workspaces = ctx.workspaces as IWorkspaces
    this.remote = (ctx as unknown as { remote?: NativeRemote }).remote
  }

  private unwrapRemote<T>(response: RemoteResult<T>): T {
    if (response.ok) return response.value
    const error = new Error(response.error.message) as Error & { code: string; details: object }
    error.code = response.error.code
    error.details = response.error.details ?? {}
    throw error
  }

  private unwrapApi<T>(response: { result: { ok: true; value: T } | { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } } }): T {
    if (response.result.ok) return response.result.value
    const error = new Error(response.result.error.message) as Error & { code: string; details: Record<string, unknown> }
    error.code = response.result.error.code
    error.details = response.result.error.details ?? {}
    throw error
  }

  async rpc<T>(endpoint: string, payload: Record<string, unknown> = {}): Promise<T> {
    const result = await this.connection.rpc.call(KNOWLEDGE_DESK_RPC_CHANNEL, endpoint, payload) as CompatRpcResult<T>
    if (!result.ok) {
      const tagged = /^\[([a-z0-9-]+)\]\s*(.*)$/i.exec(result.error.message)
      const error = new Error(tagged?.[2] ?? result.error.message) as Error & { code: string; details: Record<string, unknown> }
      error.code = tagged?.[1] ?? result.error.code
      error.details = result.error.details
      throw error
    }
    return result.value
  }

  session(sessionId: string): SessionHandle | undefined {
    const binding = this.sessions.binding(sessionId as SessionId)
    return binding === undefined ? undefined : { id: sessionId, face: binding.session }
  }

  sessionSnapshot(sessionId: string): ConversationSnapshot | undefined {
    return this.session(sessionId)?.face.getSnapshot()
  }

  openSession(sessionId: string): void {
    this.sessions.open(sessionId as SessionId)
  }

  async prepareSession(sessionId: string): Promise<void> {
    this.sessions.open(sessionId as SessionId)
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (this.session(sessionId) !== undefined) return
      await new Promise(resolve => { window.setTimeout(resolve, 50) })
    }
    throw new Error(`session ${sessionId} did not attach after opening`)
  }

  clearSessionSelection(): void {
    this.sessions.clear()
  }

  async newSession(cwd?: string): Promise<string> {
    const sessionId = await this.sessions.create(cwd === undefined ? {} : { cwd })
    this.sessions.open(sessionId)
    return String(sessionId)
  }

  async newSessionFromPreset(input: { workspaceId?: string; cwd?: string; agentPreset: string }): Promise<{ sessionId: string; agentPreset?: string }> {
    const value = this.unwrapApi(await this.connection.api.sessions.create({
      ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId as WorkspaceId }),
      ...(input.workspaceId !== undefined || input.cwd === undefined ? {} : { cwd: input.cwd }),
      agentPreset: input.agentPreset,
    }))
    this.sessions.open(value.sessionId)
    return { sessionId: String(value.sessionId), ...(value.agentPreset === undefined ? {} : { agentPreset: value.agentPreset }) }
  }

  async listAgentPresets(): Promise<AgentPresetView[]> {
    const value = this.unwrapApi(await this.connection.api.agentPresets.list({}))
    return value.presets.map(preset => ({
      id: preset.id,
      trust: preset.trust,
      isDefault: preset.isDefault,
      ...(preset.name === undefined ? {} : { name: preset.name }),
      ...(preset.description === undefined ? {} : { description: preset.description }),
      ...(preset.broken === undefined ? {} : { broken: preset.broken }),
    }))
  }

  async listNativeSessions(): Promise<NativeSessionView[]> {
    const value = this.unwrapApi(await this.connection.api.sessions.list({}))
    return value.items.map(item => ({
      sessionId: String(item.sessionId), blank: item.blank, running: item.running, updatedAt: item.updatedAt,
      ...(item.cwd === undefined ? {} : { cwd: item.cwd }),
      ...(item.agentPreset === undefined ? {} : { agentPreset: item.agentPreset }),
    }))
  }

  async selectAgentPreset(sessionId: string, agentPreset: string): Promise<string> {
    const value = this.unwrapApi(await this.connection.api.agentPresets.select({ sessionId: sessionId as never, agentPreset }))
    return value.agentPreset
  }

  async sessionModels(sessionId: string): Promise<SessionModels> {
    return this.unwrapApi(await this.connection.api.sessions.models({ sessionId: sessionId as never }))
  }

  async selectModel(sessionId: string, selection: ModelSelection): Promise<ModelSelection> {
    const value = this.unwrapApi(await this.connection.api.sessions.selectModel({
      sessionId: sessionId as never,
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort }),
    }))
    return value.selected
  }

  async listSkills(sessionId: string): Promise<readonly SkillEntry[]> {
    return this.unwrapApi(await this.connection.api.skills.list({ sessionId: sessionId as never })).skills
  }

  async listCommands(sessionId: string): Promise<readonly NativeCommandView[]> {
    if (this.remote === undefined) throw new Error('This DSH build does not expose the native Remote catalog.')
    return this.unwrapRemote(await this.remote.commands.list(sessionId))
  }

  async listPlugins(): Promise<readonly PluginInventoryEntryView[]> {
    if (this.remote === undefined) throw new Error('This DSH build does not expose the plugin inventory Remote.')
    return this.unwrapRemote(await this.remote.pluginInventory.list()).entries
  }

  async ensureTerminalOwner(input: { preferredSessionId?: string; workspaceId?: string; cwd?: string }): Promise<string> {
    const live = await this.rpc<Array<{ sessionId: string }>>('agents/list')
    if (input.preferredSessionId !== undefined && live.some(agent => agent.sessionId === input.preferredSessionId)) {
      return input.preferredSessionId
    }
    const sessionId = await this.sessions.create(input.workspaceId === undefined
      ? (input.cwd === undefined ? {} : { cwd: input.cwd })
      : { workspaceId: input.workspaceId as WorkspaceId })
    this.sessions.open(sessionId)
    return String(sessionId)
  }

  async chooseWorkspace(): Promise<{ path: string; workspace: WorkspaceView; sessionId: string } | null> {
    const path = await this.workspaces.pickDirectory()
    if (path === null) return null
    const workspace = await this.workspaces.create({ path })
    const sessionId = await this.workspaces.connectWorkspace(workspace.workspaceId)
    this.sessions.open(sessionId)
    return { path, workspace, sessionId: String(sessionId) }
  }

  async openWorkspace(workspaceId: string): Promise<string> {
    const sessionId = await this.workspaces.connectWorkspace(workspaceId as WorkspaceId)
    this.sessions.open(sessionId)
    return String(sessionId)
  }

  async renameSession(sessionId: string, title: string): Promise<string> {
    const handle = this.session(sessionId)
    if (handle === undefined) throw new Error(`session ${sessionId} is unavailable`)
    const result = await handle.face.rename(title)
    if (!result.ok) throw new Error(result.error.message)
    return result.value.title
  }

  async command(sessionId: string, line: string): Promise<void> {
    const handle = this.session(sessionId)
    if (handle === undefined) throw new Error(`session ${sessionId} is unavailable`)
    const result = await handle.face.command(line)
    if (!result.ok) throw new Error(result.error.message)
    if (!result.value.matched) throw new Error(`DSH does not provide the ${line.split(/\s+/)[0]} command in this profile.`)
  }

  async exportSession(sessionId: string, format: 'markdown' | 'json', title?: string): Promise<SessionExportView> {
    return await this.rpc<SessionExportView>('session/export', { sessionId, format, ...(title === undefined ? {} : { title }) })
  }

  async connectWorkspacePath(path: string): Promise<string> {
    const workspace = await this.workspaces.create({ path })
    return await this.openWorkspace(String(workspace.workspaceId))
  }

  async deepSeekCredential(): Promise<CredentialView> {
    const response = await this.connection.api.credentials.describe({ refs: ['DEEPSEEK_API_KEY'] })
    const value = this.unwrapApi(response)
    return value.credentials.DEEPSEEK_API_KEY ?? { configured: false, writable: false }
  }

  async setDeepSeekCredential(value: string): Promise<void> {
    if (value.trim() === '') throw new Error('API key cannot be empty.')
    this.unwrapApi(await this.connection.api.credentials.set({ ref: 'DEEPSEEK_API_KEY', value }))
  }

  async unsetDeepSeekCredential(): Promise<void> {
    this.unwrapApi(await this.connection.api.credentials.unset({ ref: 'DEEPSEEK_API_KEY' }))
  }

  async prompt(sessionId: string, text: string, mode: 'queue' | 'steer' = 'queue'): Promise<void> {
    const handle = this.session(sessionId)
    if (handle === undefined) throw new Error(`session ${sessionId} is unavailable`)
    const result = await handle.face.prompt([{ type: 'text', text }], mode)
    if (!result.ok) throw new Error(result.error.message)
  }

  async cancel(sessionId: string): Promise<void> {
    const handle = this.session(sessionId)
    if (handle === undefined) throw new Error(`session ${sessionId} is unavailable`)
    const result = await handle.face.cancel()
    if (!result.ok) throw new Error(result.error.message)
  }

  async loadOlder(sessionId: string): Promise<void> {
    const handle = this.session(sessionId)
    if (handle === undefined) throw new Error(`session ${sessionId} is unavailable`)
    await handle.face.loadOlder()
  }

  async attachmentDataUrl(sessionId: string, attachment: { id?: unknown; mimeType?: unknown }): Promise<string> {
    const handle = this.session(sessionId)
    if (handle === undefined) throw new Error(`session ${sessionId} is unavailable`)
    const id = attachment.id
    if (typeof id !== 'string') throw new Error('image attachment has no id')
    const result = await handle.face.readAttachment(id as never)
    if (!result.ok) throw new Error(result.error.message)
    const bytes = result.value.data
    let binary = ''
    const stride = 0x8000
    for (let index = 0; index < bytes.length; index += stride) {
      binary += String.fromCharCode(...bytes.subarray(index, index + stride))
    }
    const mime = typeof attachment.mimeType === 'string' ? attachment.mimeType : 'image/png'
    return `data:${mime};base64,${btoa(binary)}`
  }
}
