import { describe, it, expect } from 'vitest'
import { writeFile, unlink, mkdtemp, readFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { isProbablyBinary } from '../src/lib/is-probably-binary'
import { readTextFileFromBuffer } from '../src/lib/read-text-file'

describe('isProbablyBinary', () => {
  it('detects NUL as binary', () => {
    expect(isProbablyBinary(Buffer.from([0x48, 0x00, 0x49]))).toBe(true)
  })
  it('allows utf8 text', () => {
    expect(isProbablyBinary(Buffer.from('# hello 中文', 'utf8'))).toBe(false)
  })
})

describe('readTextFileFromBuffer', () => {
  it('reads utf-8', () => {
    const r = readTextFileFromBuffer(Buffer.from('# hi', 'utf8'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('# hi')
  })
})

describe('readTextFileFromPath integration', () => {
  it('reads utf-8 file from disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mdr-test-'))
    const p = join(dir, 't.md')
    await writeFile(p, '# disk\n', 'utf8')
    const buf = await readFile(p)
    const r = readTextFileFromBuffer(buf)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('# disk\n')
    await unlink(p)
  })
})
