export type OutlineItem = {
  depth: number
  text: string
  id: string
}

export type OpenFileSuccess = {
  ok: true
  path: string
  markdown: string
  usedEncoding: 'utf-8' | string
  warnLargeFile: boolean
  warnLargeChars: boolean
}

export type OpenFileError = {
  ok: false
  code: 'NOT_FOUND' | 'EACCES' | 'BINARY_LIKELY' | 'ENCODING_UNKNOWN' | 'UNKNOWN'
  message: string
  detail?: string
}

export type OpenFileResult = OpenFileSuccess | OpenFileError
