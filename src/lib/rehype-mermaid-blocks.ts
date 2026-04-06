import { visit } from 'unist-util-visit'
import type { Element, Root as HastRoot, Text } from 'hast'

function languageFromClassName(className: unknown): string | null {
  if (!Array.isArray(className)) return null
  for (const c of className) {
    if (typeof c === 'string' && c.startsWith('language-')) {
      return c.slice('language-'.length).toLowerCase()
    }
  }
  return null
}

function collectText(node: Element): string {
  let out = ''
  for (const child of node.children ?? []) {
    if (child.type === 'text') {
      out += (child as Text).value
    } else if (child.type === 'element') {
      out += collectText(child as Element)
    }
  }
  return out
}

/**
 * 将 ```mermaid 围栏（rehype 中 pre > code.language-mermaid）替换为
 * Mermaid 客户端所需的 div.mermaid。
 */
export function rehypeMermaidBlocks() {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre') return
      const code = node.children[0]
      if (!code || code.type !== 'element' || code.tagName !== 'code') return
      if (languageFromClassName(code.properties?.className) !== 'mermaid') return

      const source = collectText(code as Element)
      const replacement: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: source }]
      }

      if (parent && typeof index === 'number') {
        parent.children[index] = replacement
      }
    })
  }
}
