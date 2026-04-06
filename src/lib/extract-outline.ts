import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'
import GithubSlugger from 'github-slugger'
import type { Root } from 'mdast'
import type { OutlineItem } from '../shared/types'

export function extractOutline(markdown: string): OutlineItem[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root
  const slugger = new GithubSlugger()
  const items: OutlineItem[] = []
  visit(tree, 'heading', (node) => {
    const text = toString(node).trim()
    if (!text) return
    const id = slugger.slug(text)
    items.push({ depth: node.depth, text, id })
  })
  return items
}
