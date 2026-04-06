import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Element, Root as HastRoot } from 'hast'

export type RenderOptions = {
  baseDir: string | null
}

/** 渲染进程无 Node `path`/`url`，用最小实现解析本地图片为 file URL */
function isAbsolutePath(src: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(src) || src.startsWith('/') || src.startsWith('\\')
}

function resolveAgainstBase(baseDir: string, rel: string): string {
  const b = baseDir.replace(/[\\/]+$/, '')
  const sep = b.includes('\\') ? '\\' : '/'
  const r = rel.replace(/^\.?[\\/]+/, '')
  return `${b}${sep}${r}`
}

function pathToFileUrl(absPath: string): string {
  const norm = absPath.replace(/\\/g, '/')
  const win = /^([a-zA-Z]):(\/(.*))?$/i.exec(norm)
  if (win) {
    const drive = win[1].toUpperCase()
    const rest = win[3] ?? ''
    const segs = rest.split('/').filter(Boolean).map(encodeURIComponent)
    return segs.length ? `file:///${drive}:/${segs.join('/')}` : `file:///${drive}:/`
  }
  const segs = norm.split('/').filter(Boolean).map(encodeURIComponent)
  return `file:///${segs.join('/')}`
}

const schema = {
  ...defaultSchema,
  /** 与正文 slug 一致，避免 `id` 被加上 `user-content-` 前缀 */
  clobberPrefix: '',
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), 'http', 'https', 'file', 'data'],
    href: [...(defaultSchema.protocols?.href ?? []), 'http', 'https', 'file', 'mailto']
  }
}

function rewriteImageSrc(tree: HastRoot, baseDir: string | null): void {
  if (!baseDir) return
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'img') return
    const src = node.properties?.src
    if (typeof src !== 'string' || src.length === 0) return
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return
    const abs = isAbsolutePath(src) ? src : resolveAgainstBase(baseDir, src)
    node.properties = { ...node.properties, src: pathToFileUrl(abs) }
  })
}

export async function renderMarkdownToHtml(
  markdown: string,
  options: RenderOptions
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(() => (tree: HastRoot) => {
      rewriteImageSrc(tree, options.baseDir)
    })
    .use(rehypeSlug)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown)
  return String(file)
}
