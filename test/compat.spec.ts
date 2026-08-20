import { describe, expect, it } from 'vitest'
import { DshClientAdapter } from '../src/dsh-compat/client.ts'
import { createCapabilities } from '../src/dsh-compat/protocol.ts'

function adapterReturning(value: unknown): DshClientAdapter {
  return new DshClientAdapter({
    connection: { rpc: { call: async () => value } },
    sessions: {},
  } as never)
}

describe('DSH compatibility boundary', () => {
  it('advertises only capabilities the adapter actually supports', () => {
    expect(createCapabilities(true)).toMatchObject({ terminal: true, terminalResize: false, modelMetrics: true })
    expect(createCapabilities(false)).toMatchObject({ terminal: false, terminalResize: false })
  })

  it('unwraps successful logical RPC results', async () => {
    const adapter = adapterReturning({ ok: true, value: { items: 3 } })
    await expect(adapter.rpc<{ items: number }>('example')).resolves.toEqual({ items: 3 })
  })

  it('preserves compatibility errors for UI diagnostics', async () => {
    const adapter = adapterReturning({ ok: false, error: { code: 'internal', message: '[save-conflict] changed on disk', details: {} } })
    await expect(adapter.rpc('files/write')).rejects.toMatchObject({ code: 'save-conflict', message: 'changed on disk' })
  })

  it('uses the official write-only credential API without reading the secret back', async () => {
    const calls: unknown[] = []
    const adapter = new DshClientAdapter({
      connection: {
        rpc: { call: async () => ({ ok: true, value: {} }) },
        api: { credentials: {
          describe: async (payload: unknown) => { calls.push(['describe', payload]); return { result: { ok: true, value: { credentials: { DEEPSEEK_API_KEY: { configured: true, source: 'file', writable: true } } } } } },
          set: async (payload: unknown) => { calls.push(['set', payload]); return { result: { ok: true, value: {} } } },
          unset: async (payload: unknown) => { calls.push(['unset', payload]); return { result: { ok: true, value: {} } } },
        } },
      },
      sessions: {},
      workspaces: {},
    } as never)
    await expect(adapter.deepSeekCredential()).resolves.toEqual({ configured: true, source: 'file', writable: true })
    await adapter.setDeepSeekCredential('ds-secret')
    await adapter.unsetDeepSeekCredential()
    expect(calls).toEqual([
      ['describe', { refs: ['DEEPSEEK_API_KEY'] }],
      ['set', { ref: 'DEEPSEEK_API_KEY', value: 'ds-secret' }],
      ['unset', { ref: 'DEEPSEEK_API_KEY' }],
    ])
  })

  it('preserves rc.8 command image-capability metadata without bypassing SessionFace', async () => {
    const adapter = new DshClientAdapter({
      connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
      sessions: {},
      remote: { commands: { list: async () => ({ ok: true, value: [{ name: 'vision', description: 'Inspect images', input: { hint: 'prompt', images: true } }] }) } },
    } as never)
    await expect(adapter.listCommands('agent')).resolves.toEqual([
      { name: 'vision', description: 'Inspect images', input: { hint: 'prompt', images: true } },
    ])
  })

  it('routes folder selection through the DSH workspace registry before opening its Agent', async () => {
    const calls: unknown[] = []
    const adapter = new DshClientAdapter({
      connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
      sessions: { open: (id: string) => { calls.push(['open', id]) } },
      workspaces: {
        pickDirectory: async () => { calls.push(['pick']); return '/outside/project' },
        create: async (input: unknown) => { calls.push(['create', input]); return { workspaceId: 'workspace-1', path: '/outside/project', title: 'project', sessionIds: [], createdAt: '', updatedAt: '' } },
        connectWorkspace: async (id: string) => { calls.push(['connect', id]); return 'session-1' },
      },
    } as never)
    await expect(adapter.chooseWorkspace()).resolves.toMatchObject({ path: '/outside/project', sessionId: 'session-1' })
    expect(calls).toEqual([
      ['pick'],
      ['create', { path: '/outside/project' }],
      ['connect', 'workspace-1'],
      ['open', 'session-1'],
    ])
  })

  it('creates a live workspace-owned terminal session instead of reusing a cold blank one', async () => {
    const calls: unknown[] = []
    const adapter = new DshClientAdapter({
      connection: { rpc: { call: async () => ({ ok: true, value: [] }) } },
      sessions: {
        create: async (options: unknown) => { calls.push(['create', options]); return 'terminal-owner' },
        open: (id: string) => { calls.push(['open', id]) },
      },
      workspaces: {},
    } as never)
    await expect(adapter.ensureTerminalOwner({ preferredSessionId: 'cold', workspaceId: 'workspace-1', cwd: '/project' })).resolves.toBe('terminal-owner')
    expect(calls).toEqual([['create', { workspaceId: 'workspace-1' }], ['open', 'terminal-owner']])
  })
})
