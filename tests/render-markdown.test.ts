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
})
