import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarkdownText } from '../src/apps/knowledge-desk/MarkdownText.tsx'

describe('pixel-safe Markdown output', () => {
  it('renders headings, bold text, lists, and tables without raw HTML injection', () => {
    const source = '# Heading\n\n**bold** and `code`\n\n- one\n- two\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n<script>alert(1)</script>'
    const html = renderToStaticMarkup(createElement(MarkdownText, { text: source, onOpenFile: () => undefined }))
    expect(html).toContain('<h1>Heading</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<table>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })
})
