import { describe, it, expect } from 'vitest'
import { renderMarkdownToHtml } from '../src/lib/render-markdown'

describe('renderMarkdownToHtml', () => {
  it('renders GFM table', async () => {
    const md = '|a|b|\n|-|-|\n|1|2|\n'
    const html = await renderMarkdownToHtml(md, { baseDir: null })
    expect(html).toContain('<table>')
    expect(html).toContain('1')
  })

  it('does not pass through raw script tags from HTML blocks', async () => {
    const md = '<script>alert(1)</script>\n\n# Hi'
    const html = await renderMarkdownToHtml(md, { baseDir: null })
    expect(html.toLowerCase()).not.toContain('<script')
  })

  it('adds id to heading for slug navigation', async () => {
    const html = await renderMarkdownToHtml('# Title\n', { baseDir: null })
    expect(html).toContain('id="title"')
  })

  it('turns mermaid fenced block into div.mermaid with diagram source', async () => {
    const md = '```mermaid\nflowchart LR\n  A --> B\n```\n'
    const html = await renderMarkdownToHtml(md, { baseDir: null })
    expect(html).toContain('class="mermaid"')
    expect(html).toContain('flowchart LR')
    expect(html).toContain('A --> B')
    expect(html.toLowerCase()).not.toContain('language-mermaid')
  })

  it('leaves non-mermaid fenced code as pre/code', async () => {
    const md = '```js\nconst x = 1\n```\n'
    const html = await renderMarkdownToHtml(md, { baseDir: null })
    expect(html).toContain('<pre>')
    expect(html).toContain('language-js')
    expect(html).not.toContain('class="mermaid"')
  })
})
