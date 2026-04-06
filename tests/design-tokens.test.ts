import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const cssPath = join(repoRoot, 'src', 'renderer', 'src', 'styles.css')
const css = readFileSync(cssPath, 'utf8')

describe('styles.css design tokens', () => {
  it('uses ink primary from DESIGN.md', () => {
    expect(css).toMatch(/--primary:\s*#1b4965\b/)
  })

  it('declares font stacks from DESIGN.md', () => {
    expect(css).toMatch(/--font-ui:[^;]*DM Sans/)
    expect(css).toMatch(/--font-body:[^;]*Source Serif 4/)
    expect(css).toMatch(/--font-mono:[^;]*JetBrains Mono/)
  })

  it('uses paper grain overlay', () => {
    expect(css).toMatch(/body::before\s*\{/)
    expect(css).toMatch(/feTurbulence/)
  })

  it('limits reading column to about 42rem per DESIGN.md', () => {
    expect(css).toMatch(/\.article\s*\{[^}]*max-width:\s*42rem/s)
  })

  it('uses expanded space scale aligned with DESIGN.md', () => {
    expect(css).toMatch(/--space-2xs:\s*2px/)
    expect(css).toMatch(/--space-3xl:\s*64px/)
  })
})
