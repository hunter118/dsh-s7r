import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import type { DshClientAdapter } from '../../dsh-compat/client.ts'
import type { FileContentView, FileEntryView, FileListingView, FileWriteView, TerminalOpenView, TerminalReadView } from '../../dsh-compat/protocol.ts'
import { AuthenticImage } from '../../display/AuthenticImage.tsx'
import type { DisplayPreferences } from '../../display/preferences.ts'
import { quantizePixels } from '../../display/quantize.ts'
import { AppIcon, SystemButton, SystemInput, SystemStatusBar, SystemTextArea } from '../../system7/primitives.tsx'
import { errorMessage, formatBytes, pathBasename, pathExtension } from '../common.tsx'
import { writeDragItem } from '../../desktop/drag.ts'

;(globalThis as unknown as { pdfjsWorker: { WorkerMessageHandler: unknown } }).pdfjsWorker = { WorkerMessageHandler }

type PdfDocument = Awaited<ReturnType<typeof getDocument>['promise']>

export interface FinderAppProps {
  adapter: DshClientAdapter
  sessionId?: string | undefined
  initialPath?: string | undefined
  onOpenFile: (sessionId: string, path: string) => void
  onOpenTerminal: (sessionId: string, cwd: string) => void
}

export function FinderApp({ adapter, sessionId, initialPath, onOpenFile, onOpenTerminal }: FinderAppProps) {
  const [listing, setListing] = useState<FileListingView | null>(null)
  const [path, setPath] = useState(initialPath ?? '')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    if (sessionId === undefined) return
    let cancelled = false
    setError(null)
    void adapter.rpc<FileListingView>('files/list', { sessionId, ...(path === '' ? {} : { path }) }).then(
      value => { if (!cancelled) { setListing(value); setPath(value.path); setSelected(null) } },
      reason => { if (!cancelled) setError(errorMessage(reason)) },
    )
    return () => { cancelled = true }
  }, [adapter, sessionId, path, refreshKey])
  const open = (entry: FileEntryView) => {
    if (sessionId === undefined) return
    if (entry.type === 'directory') setPath(entry.path)
    else if (entry.type === 'file') onOpenFile(sessionId, entry.path)
    else setError(`Unsupported special file: ${entry.name}`)
  }
  if (sessionId === undefined) return <div className="kd-empty">Open or create an agent before browsing its workspace.</div>
  return <>
    <div className="kd-toolbar">
      <SystemButton disabled={listing?.parentPath === undefined} onClick={() => { if (listing?.parentPath !== undefined) setPath(listing.parentPath) }}>↑ Parent</SystemButton>
      <SystemButton onClick={() => { setRefreshKey(key => key + 1) }}>Refresh</SystemButton>
      <SystemButton disabled={listing === null} onClick={() => { if (listing !== null) onOpenTerminal(sessionId, listing.path) }}>Open in Terminal</SystemButton>
      <SystemInput aria-label="Directory path" value={path} onChange={event => { setPath(event.currentTarget.value) }} onKeyDown={event => { if (event.key === 'Enter') setRefreshKey(key => key + 1) }} />
    </div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <div className="kd-finder-head"><span>Name</span><span>Kind</span><span>Size</span></div>
    <ul className="kd-list kd-scroll kd-finder-list">
      {listing?.entries.map(entry => <li draggable={entry.type === 'file' || entry.type === 'directory'} onDragStart={event => { if (entry.type === 'file' || entry.type === 'directory') writeDragItem(event.dataTransfer, { kind: 'path', label: entry.name, sessionId, path: entry.path, pathType: entry.type }) }} key={entry.path} className="kd-list-row kd-finder-row" data-selected={selected === entry.path} onClick={() => { setSelected(entry.path) }} onDoubleClick={() => { open(entry) }}>
        <span><AppIcon app={entry.type === 'directory' ? 'folder' : 'file'} /><strong>{entry.name}</strong></span><span>{entry.type}</span><span>{formatBytes(entry.size)}</span>
      </li>)}
      {listing !== null && listing.entries.length === 0 ? <li className="kd-empty">This folder is empty.</li> : null}
    </ul>
    <SystemStatusBar>{listing === null ? 'Reading workspace…' : `${listing.entries.length} items · ${listing.path} · drag files/folders to desktop or Agent`}</SystemStatusBar>
  </>
}

export interface TextEditAppProps {
  adapter: DshClientAdapter
  sessionId: string
  path: string
  active: boolean
  windowId: string
  onDirtyChange: (windowId: string, dirty: boolean) => void
  onTitleChange: (title: string) => void
  onRunInTerminal: (sessionId: string, path: string) => void
}

export function TextEditApp({ adapter, sessionId, path, active, windowId, onDirtyChange, onTitleChange, onRunInTerminal }: TextEditAppProps) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [version, setVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeMode = !['txt', 'md', 'log', ''].includes(pathExtension(path))
  const dirty = content !== savedContent
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    void adapter.rpc<FileContentView>('files/read', { sessionId, path }).then(
      file => {
        if (cancelled) return
        if (file.encoding !== 'utf8') throw new Error('TextEdit cannot edit a binary file.')
        setContent(file.content); setSavedContent(file.content); setVersion(file.version); setLoading(false)
      },
      reason => { if (!cancelled) { setError(errorMessage(reason)); setLoading(false) } },
    )
    return () => { cancelled = true }
  }, [adapter, path, sessionId])
  useEffect(() => {
    onDirtyChange(windowId, dirty)
    onTitleChange(`${dirty ? '• ' : ''}${pathBasename(path)}`)
  }, [dirty, path, windowId])
  const save = useCallback(async () => {
    if (saving || version === null) return
    setSaving(true); setError(null)
    try {
      const result = await adapter.rpc<FileWriteView>('files/write', { sessionId, path, content, expectedVersion: version })
      setVersion(result.version); setSavedContent(content)
    } catch (reason) { setError(errorMessage(reason)) } finally { setSaving(false) }
  }, [adapter, content, path, saving, sessionId, version])
  useEffect(() => {
    const listener = () => { if (active) void save() }
    window.addEventListener('knowledge-desk:save-active', listener)
    return () => { window.removeEventListener('knowledge-desk:save-active', listener) }
  }, [active, save])
  return <>
    <div className="kd-toolbar"><SystemButton disabled={!dirty || saving || loading} onClick={() => { void save() }}>{saving ? 'Saving…' : 'Save'}</SystemButton><SystemButton onClick={() => { onRunInTerminal(sessionId, path) }}>Run in Terminal</SystemButton><span className="kd-spacer" /><span>{codeMode ? 'Code' : 'Plain Text'}</span></div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    {loading ? <div className="kd-empty">Opening document…</div> : <SystemTextArea className={`kd-editor kd-scroll ${codeMode ? 'kd-code' : ''}`} spellCheck={!codeMode} value={content} onChange={event => { setContent(event.currentTarget.value) }} />}
    <SystemStatusBar>{dirty ? 'Unsaved changes' : 'Saved'} · {content.length} characters · {path}</SystemStatusBar>
  </>
}

function decodeBytes(file: FileContentView): Uint8Array {
  if (file.encoding !== 'base64') return new TextEncoder().encode(file.content)
  const raw = atob(file.content)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

function PdfCanvas({ bytes, filtered, filterMode }: { bytes: Uint8Array; filtered: boolean; filterMode: DisplayPreferences['filterMode'] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [document, setDocument] = useState<PdfDocument | null>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    const task = getDocument({ data: bytes.slice() })
    void task.promise.then(value => { if (!disposed) setDocument(value) }, reason => { if (!disposed) setError(errorMessage(reason)) })
    return () => { disposed = true; void task.destroy(); setDocument(null) }
  }, [bytes])
  useEffect(() => {
    if (document === null || canvasRef.current === null) return
    let cancelled = false
    void document.getPage(page).then(async pdfPage => {
      if (cancelled || canvasRef.current === null) return
      const viewport = pdfPage.getViewport({ scale: zoom })
      const canvas = canvasRef.current
      const max = 1400
      const ratio = Math.min(1, max / Math.max(viewport.width, viewport.height))
      const width = Math.max(1, Math.floor(viewport.width * ratio))
      const height = Math.max(1, Math.floor(viewport.height * ratio))
      canvas.width = width; canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) return
      context.imageSmoothingEnabled = false
      await pdfPage.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise
      if (cancelled || !filtered) return
      const image = context.getImageData(0, 0, width, height)
      const processed = quantizePixels(image, filterMode)
      context.putImageData(new ImageData(Uint8ClampedArray.from(processed.data), width, height), 0, 0)
    }).catch(reason => { if (!cancelled) setError(errorMessage(reason)) })
    return () => { cancelled = true }
  }, [document, page, zoom, filtered, filterMode])
  if (error !== null) return <div className="s7-inline-error">PDF render failed: {error}</div>
  return <div className="kd-pdf-view">
    <div className="kd-toolbar"><SystemButton disabled={page <= 1} onClick={() => { setPage(value => value - 1) }}>‹ Page</SystemButton><span>{page} / {document?.numPages ?? '…'}</span><SystemButton disabled={document === null || page >= document.numPages} onClick={() => { setPage(value => value + 1) }}>Page ›</SystemButton><SystemButton onClick={() => { setZoom(value => Math.max(.4, value - .2)) }}>−</SystemButton><span>{Math.round(zoom * 100)}%</span><SystemButton onClick={() => { setZoom(value => Math.min(3, value + .2)) }}>+</SystemButton><SystemButton onClick={() => { setZoom(.75) }}>Fit Page</SystemButton><SystemButton onClick={() => { setZoom(1.15) }}>Fit Width</SystemButton></div>
    <div className="kd-preview-stage kd-scroll"><canvas ref={canvasRef} className="kd-pdf-canvas" /></div>
  </div>
}

export function PreviewApp({ adapter, sessionId, path, preferences }: { adapter: DshClientAdapter; sessionId: string; path: string; preferences: DisplayPreferences }) {
  const [file, setFile] = useState<FileContentView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)
  useEffect(() => {
    let cancelled = false
    void adapter.rpc<FileContentView>('files/read', { sessionId, path }).then(value => { if (!cancelled) setFile(value) }, reason => { if (!cancelled) setError(errorMessage(reason)) })
    return () => { cancelled = true }
  }, [adapter, sessionId, path])
  const bytes = useMemo(() => file === null ? null : decodeBytes(file), [file])
  const dataUrl = file?.encoding === 'base64' ? `data:${file.mime};base64,${file.content}` : null
  const isPdf = file?.mime === 'application/pdf'
  const filtered = isPdf ? preferences.filterPdf : preferences.filterImages
  return <>
    <div className="kd-toolbar"><SystemButton data-pressed={showOriginal || undefined} onClick={() => { setShowOriginal(value => !value) }}>{showOriginal ? 'Use Filtered View' : 'Inspect Original'}</SystemButton><span className="kd-spacer" /><span>{file?.mime ?? 'Loading…'}</span></div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    {file === null || bytes === null ? <div className="kd-empty">Opening preview…</div> : isPdf
      ? <PdfCanvas bytes={bytes} filtered={preferences.filterPdf && !showOriginal} filterMode={preferences.filterMode} />
      : dataUrl === null ? <div className="s7-inline-error">This image encoding is unsupported.</div>
        : <div className="kd-preview-stage kd-scroll"><AuthenticImage source={dataUrl} sourceIdentity={`${path}:${file.version}`} preferences={preferences} filter={preferences.filterImages && !showOriginal} alt={pathBasename(path)} /></div>}
    <SystemStatusBar>{path} · {formatBytes(file?.size)} · {showOriginal || !filtered ? 'unfiltered content' : preferences.filterMode === 'monochrome' ? '1-bit dither filter' : 'direct grayscale filter'}</SystemStatusBar>
  </>
}

export function TerminalApp({ adapter, sessionId, cwd }: { adapter: DshClientAdapter; sessionId: string; cwd?: string | undefined }) {
  const [opened, setOpened] = useState<TerminalOpenView | null>(null)
  const [output, setOutput] = useState('')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const outputRef = useRef<HTMLPreElement | null>(null)
  useEffect(() => {
    let cancelled = false
    const connect = async () => {
      for (let attempt = 0; attempt < 80 && !cancelled; attempt += 1) {
        try {
          const value = await adapter.rpc<TerminalOpenView>('terminal/open', { sessionId, ...(cwd === undefined ? {} : { cwd }) })
          if (!cancelled) { setOpened(value); setOutput(value.motd); setError(null) }
          else void adapter.rpc('terminal/close', { sessionId, terminalId: value.sessionId }).catch(() => undefined)
          return
        } catch (reason) {
          const message = errorMessage(reason)
          const code = typeof reason === 'object' && reason !== null && 'code' in reason ? String((reason as { code: unknown }).code) : ''
          if (code !== 'agent-not-live' && !message.includes('not live')) { if (!cancelled) setError(message); return }
          if (attempt === 79) { if (!cancelled) setError('Terminal owner did not become live. Close this window and try again.'); return }
          await new Promise(resolve => { window.setTimeout(resolve, 100) })
        }
      }
    }
    void connect()
    return () => { cancelled = true }
  }, [adapter, cwd, sessionId])
  useEffect(() => {
    if (opened === null) return
    let cancelled = false
    let timer: number | undefined
    const refresh = async () => {
      try {
        const value = await adapter.rpc<TerminalReadView>('terminal/read', { sessionId, terminalId: opened.sessionId, count: 2000 })
        if (!cancelled) {
          setOutput(current => current === value.text ? current : value.text)
          setError(null)
        }
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason))
      } finally {
        if (!cancelled) timer = window.setTimeout(() => { void refresh() }, document.hidden ? 250 : 60)
      }
    }
    void refresh()
    return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); void adapter.rpc('terminal/close', { sessionId, terminalId: opened.sessionId }).catch(() => undefined) }
  }, [adapter, opened, sessionId])
  useEffect(() => { outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight }) }, [output])
  const send = async () => {
    if (opened === null || busy) return
    const text = input
    setInput(''); setBusy(true); setError(null)
    try {
      await adapter.rpc('terminal/send', { sessionId, terminalId: opened.sessionId, text, submit: true })
      const read = await adapter.rpc<TerminalReadView>('terminal/read', { sessionId, terminalId: opened.sessionId, count: 2000 })
      setOutput(current => current === read.text ? current : read.text)
    } catch (reason) { setError(errorMessage(reason)) } finally { setBusy(false) }
  }
  return <>
    <div className="kd-toolbar"><SystemButton disabled={opened === null} onClick={() => { if (opened !== null) void adapter.rpc('terminal/signal', { sessionId, terminalId: opened.sessionId, signal: 'SIGINT' }) }}>Interrupt</SystemButton><span className="kd-spacer" /><span>{opened === null ? 'Connecting to zsh…' : `zsh · ${opened.sessionId}`}</span></div>
    {error === null ? null : <div className="s7-inline-error">{error}</div>}
    <pre ref={outputRef} className="kd-terminal-output kd-scroll">{output}</pre>
    <form className="kd-terminal-input" onSubmit={event => { event.preventDefault(); void send() }}><span>$</span><SystemInput aria-label="zsh command line" autoComplete="off" value={input} onChange={event => { setInput(event.currentTarget.value) }} disabled={opened === null || busy} autoFocus /><SystemButton type="submit" disabled={opened === null || busy}>Send Line</SystemButton></form>
    <SystemStatusBar>{cwd ?? 'session workspace'} · real zsh PTY · 60ms live output · raw keystrokes and resize unavailable</SystemStatusBar>
  </>
}
