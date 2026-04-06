import { contextBridge, ipcRenderer } from 'electron'
import type { OpenFileResult } from '../shared/types'

contextBridge.exposeInMainWorld('readerApi', {
  openFileDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
  openPath: (path: string): Promise<OpenFileResult> => ipcRenderer.invoke('file:openPath', path),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  onFileOpenRequested: (cb: (path: string) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, p: string) => cb(p)
    ipcRenderer.on('app:open-file', listener)
    return () => ipcRenderer.removeListener('app:open-file', listener)
  }
})
