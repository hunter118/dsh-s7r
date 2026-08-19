import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ConversationSnapshot, SessionFace } from '@deepseek-ai/dsh-client-runtime/client'
import type { DshClientAdapter } from '../dsh-compat/client.ts'
import type { ContextUsageView } from '../dsh-compat/protocol.ts'

export function useSessionFace(adapter: DshClientAdapter, sessionId: string): SessionFace | undefined {
  const [face, setFace] = useState(() => adapter.session(sessionId)?.face)
  useEffect(() => {
    setFace(adapter.session(sessionId)?.face)
    const timer = window.setInterval(() => {
      const next = adapter.session(sessionId)?.face
      setFace(previous => previous === next ? previous : next)
    }, 1000)
    return () => { window.clearInterval(timer) }
  }, [adapter, sessionId])
  return face
}

function BoundSessionSnapshot({ face, children }: { face: SessionFace; children: (snapshot: ConversationSnapshot) => React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    listener => face.subscribe(listener),
    () => face.getSnapshot(),
    () => face.getSnapshot(),
  )
  return children(snapshot)
}

export function SessionSnapshot({ adapter, sessionId, children, unavailable }: {
  adapter: DshClientAdapter
  sessionId: string
  children: (snapshot: ConversationSnapshot) => React.ReactNode
  unavailable?: React.ReactNode
}) {
  const face = useSessionFace(adapter, sessionId)
  if (face === undefined) return unavailable ?? <div className="kd-empty">Session unavailable.</div>
  return <BoundSessionSnapshot face={face}>{children}</BoundSessionSnapshot>
}

export function formatTime(time: number): string {
  try { return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '—' }
}

export function formatBytes(size: number | undefined): string {
  if (size === undefined) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}K`
  return `${(tokens / 1_000_000).toFixed(tokens < 10_000_000 ? 1 : 0)}M`
}

export function formatContextUsage(context: ContextUsageView | undefined): string | undefined {
  if (context === undefined) return undefined
  const used = formatTokenCount(context.contextTokens)
  if (context.contextWindow === undefined) return `${used} tok`
  const percent = context.contextTokens / context.contextWindow * 100
  return `${used} / ${formatTokenCount(context.contextWindow)} · ${percent.toFixed(0)}%`
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function pathExtension(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? ''
  const index = name.lastIndexOf('.')
  return index < 0 ? '' : name.slice(index + 1).toLowerCase()
}

export function pathBasename(path: string): string {
  return path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? path
}
