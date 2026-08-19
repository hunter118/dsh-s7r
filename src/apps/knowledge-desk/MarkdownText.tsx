import { Fragment, type JSX, type ReactNode } from 'react'
import { pixelizeEmoji } from '../../display/pixel-emoji.ts'

const FILE_PATTERN = /((?:\.\.?\/|\/)[\w@%+.,~()\-\/\\ ]+\.(?:txt|md|json|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|css|html|py|rs|go|java|c|cc|cpp|h|hpp|pdf|png|jpe?g|gif|webp|bmp|svg))/gi
const FILE_PART = /^(?:\.\.?\/|\/).+\.(?:txt|md|json|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|css|html|py|rs|go|java|c|cc|cpp|h|hpp|pdf|png|jpe?g|gif|webp|bmp|svg)$/i
const TABLE_RULE = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/

function linkedText(text: string, onOpenFile: (path: string) => void, key: string): ReactNode[] {
  return pixelizeEmoji(text).split(FILE_PATTERN).map((part, index) => FILE_PART.test(part)
    ? <button className="kd-file-link" key={`${key}:file:${index}`} onClick={() => { onOpenFile(part) }}>{part}</button>
    : <Fragment key={`${key}:text:${index}`}>{part}</Fragment>)
}

function InlineMarkdown({ text, onOpenFile }: { text: string; onOpenFile: (path: string) => void }) {
  const tokens = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g)
  return <>{tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{linkedText(token.slice(2, -2), onOpenFile, `b:${index}`)}</strong>
    if (token.startsWith('`') && token.endsWith('`')) return <code key={index}>{token.slice(1, -1)}</code>
    return <Fragment key={index}>{linkedText(token, onOpenFile, `t:${index}`)}</Fragment>
  })}</>
}

function tableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(cell => cell.trim())
}

function startsBlock(lines: string[], index: number): boolean {
  const line = lines[index] ?? ''
  return line.trim() === '' || /^#{1,6}\s+/.test(line) || /^```/.test(line) || /^\s*(?:[-*+] |\d+\. )/.test(line) || /^>\s?/.test(line)
    || (line.includes('|') && TABLE_RULE.test(lines[index + 1] ?? ''))
}

export function MarkdownText({ text, onOpenFile }: { text: string; onOpenFile: (path: string) => void }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.trim() === '') { index += 1; continue }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading !== null) {
      const level = heading[1]!.length
      const Tag = `h${level}` as keyof JSX.IntrinsicElements
      blocks.push(<Tag key={`h:${index}`}><InlineMarkdown text={heading[2]!} onOpenFile={onOpenFile} /></Tag>)
      index += 1; continue
    }

    if (/^```/.test(line)) {
      const language = line.slice(3).trim()
      const body: string[] = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index] ?? '')) { body.push(lines[index] ?? ''); index += 1 }
      if (index < lines.length) index += 1
      blocks.push(<pre className="kd-markdown-code" key={`code:${index}`} data-language={language || undefined}><code>{pixelizeEmoji(body.join('\n'))}</code></pre>)
      continue
    }

    if (line.includes('|') && TABLE_RULE.test(lines[index + 1] ?? '')) {
      const head = tableCells(line)
      index += 2
      const rows: string[][] = []
      while (index < lines.length && (lines[index] ?? '').includes('|') && (lines[index] ?? '').trim() !== '') { rows.push(tableCells(lines[index] ?? '')); index += 1 }
      blocks.push(<div className="kd-markdown-table-wrap" key={`table:${index}`}><table><thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex}><InlineMarkdown text={cell} onOpenFile={onOpenFile} /></th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{head.map((_, cellIndex) => <td key={cellIndex}><InlineMarkdown text={row[cellIndex] ?? ''} onOpenFile={onOpenFile} /></td>)}</tr>)}</tbody></table></div>)
      continue
    }

    const list = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(line)
    if (list !== null) {
      const ordered = /\d+\./.test(list[1]!)
      const items: string[] = []
      while (index < lines.length) {
        const match = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(lines[index] ?? '')
        if (match === null || /\d+\./.test(match[1]!) !== ordered) break
        items.push(match[2]!); index += 1
      }
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(<Tag key={`list:${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown text={item} onOpenFile={onOpenFile} /></li>)}</Tag>)
      continue
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) { quoted.push((lines[index] ?? '').replace(/^>\s?/, '')); index += 1 }
      blocks.push(<blockquote key={`quote:${index}`}><InlineMarkdown text={quoted.join('\n')} onOpenFile={onOpenFile} /></blockquote>)
      continue
    }

    const paragraph = [line]
    index += 1
    while (index < lines.length && !startsBlock(lines, index)) { paragraph.push(lines[index] ?? ''); index += 1 }
    blocks.push(<p key={`p:${index}`}><InlineMarkdown text={paragraph.join('\n')} onOpenFile={onOpenFile} /></p>)
  }
  return <div className="kd-markdown">{blocks}</div>
}
