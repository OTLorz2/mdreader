import { describe, it, expect } from 'vitest'
import { extractOutline } from '../src/lib/extract-outline'

describe('extractOutline', () => {
  it('collects ATX headings with depths 1-6', () => {
    const md = '# A\n## B\n###### C\n'
    expect(extractOutline(md)).toEqual([
      { depth: 1, text: 'A', id: 'a' },
      { depth: 2, text: 'B', id: 'b' },
      { depth: 6, text: 'C', id: 'c' }
    ])
  })

  it('dedupes slug like GitHub (second identical title gets suffix)', () => {
    const md = '# Hello\n# Hello\n'
    const o = extractOutline(md)
    expect(o[0].id).toBe('hello')
    expect(o[1].id).toBe('hello-1')
  })

  it('returns empty array when no ATX headings', () => {
    expect(extractOutline('plain\n')).toEqual([])
  })
})
