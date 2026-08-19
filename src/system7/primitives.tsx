import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function SystemButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props
  return <button {...rest} className={`s7-button ${className}`.trim()} />
}

export function SystemIconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <button {...props} className={`s7-icon-button ${props.className ?? ''}`.trim()} aria-label={label} title={label}>{children}</button>
}

export function SystemInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input {...rest} className={`s7-input ${className}`.trim()} />
}

export function SystemTextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return <textarea {...rest} className={`s7-textarea ${className}`.trim()} />
}

export function SystemSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props
  return <select {...rest} className={`s7-select ${className}`.trim()} />
}

export function SystemCheckbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return <label className="s7-check"><input {...props} type="checkbox" /><span className="s7-check-box" /> <span>{label}</span></label>
}

export function SystemRadio({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return <label className="s7-radio"><input {...props} type="radio" /><span className="s7-radio-dot" /> <span>{label}</span></label>
}

export function SystemPanel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return <fieldset className={`s7-panel ${className}`.trim()}>{title === undefined ? null : <legend>{title}</legend>}{children}</fieldset>
}

export function SystemStatusBar({ children }: { children: ReactNode }) {
  return <div className="s7-status"><span>{children}</span><span className="s7-resize-lines" aria-hidden="true">≋</span></div>
}

export function SystemDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="s7-dialog-shade" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="s7-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="s7-dialog-title">{title}</div>
      <div className="s7-dialog-body">{children}</div>
    </section>
  </div>
}

export function AppIcon({ app }: { app: string }) {
  const glyph: Record<string, string> = {
    'knowledge-desk': 'KD', finder: '▤', textedit: 'T', preview: '◫', terminal: '>_', timeline: '≡',
    scrapbook: '▦', clock: '◷', puzzle: '15', monitor: '▥', settings: '⚙', 'control-panel': '▧', find: '?', trash: '▥', folder: '▰', file: '▥',
  }
  return <span className={`s7-app-icon s7-app-icon-${app}`} aria-hidden="true">{glyph[app] ?? '◆'}</span>
}
