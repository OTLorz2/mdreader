import type { OpenFileResult } from '../shared/types'

export interface ReaderApi {
  openFileDialog: () => Promise<string | null>
  openPath: (path: string) => Promise<OpenFileResult>
  openExternal: (url: string) => Promise<void>
  onFileOpenRequested: (cb: (path: string) => void) => () => void
}

declare global {
  interface Window {
    readerApi: ReaderApi
  }
}
