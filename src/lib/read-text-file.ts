import { decode } from 'iconv-lite'
import chardet from 'chardet'
import { isProbablyBinary } from './is-probably-binary'

export type ReadOk = { ok: true; text: string; encoding: string }
export type ReadErr = { ok: false; code: 'BINARY_LIKELY' | 'ENCODING_UNKNOWN'; message: string }
export type ReadResult = ReadOk | ReadErr

export function readTextFileFromBuffer(buf: Buffer): ReadResult {
  if (isProbablyBinary(buf)) {
    return {
      ok: false,
      code: 'BINARY_LIKELY',
      message: 'File looks binary (ERR_BINARY_LIKELY)'
    }
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    return { ok: true, text, encoding: 'utf-8' }
  } catch {
    const guess = chardet.detect(buf) ?? null
    if (!guess) {
      return {
        ok: false,
        code: 'ENCODING_UNKNOWN',
        message: 'Cannot decode as UTF-8; charset unknown (ERR_ENCODING)'
      }
    }
    try {
      const text = decode(buf, guess)
      return { ok: true, text, encoding: guess }
    } catch {
      return {
        ok: false,
        code: 'ENCODING_UNKNOWN',
        message: 'Cannot decode file (ERR_ENCODING)'
      }
    }
  }
}
