import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { MAX_FILE_BYTES, MAX_MARKDOWN_CHARS } from '../shared/constants'
import type { OpenFileResult } from '../shared/types'
import { readTextFileFromBuffer } from '../lib/read-text-file'

if (typeof app?.requestSingleInstanceLock !== 'function') {
  console.error(
    '[MarkdownReader] Electron 主进程 API 不可用。若环境变量 ELECTRON_RUN_AS_NODE=1，请清除后重开终端再运行 npm run dev。'
  )
  process.exit(1)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const p = extractFileArg(argv)
    if (p) sendOpenToWindow(p)
  })
}

app.on('open-file', (e, path) => {
  e.preventDefault()
  sendOpenToWindow(path)
})

function extractFileArg(argv: string[]): string | null {
  const tail = argv.slice(1).filter((x) => {
    if (x.startsWith('-') || x === '.' || x === '--') return false
    if (x.endsWith('electron.exe') || x.endsWith('Electron.app')) return false
    if (x.includes('node_modules')) return false
    return true
  })
  for (let i = tail.length - 1; i >= 0; i--) {
    const p = tail[i]
    if (/\.(md|markdown)$/i.test(p)) return p
  }
  return null
}

let mainWindow: BrowserWindow | null = null

function sendOpenToWindow(filePath: string): void {
  const w = BrowserWindow.getFocusedWindow() ?? mainWindow ?? BrowserWindow.getAllWindows()[0]
  w?.webContents.send('app:open-file', filePath)
}

async function openPathHandler(filePath: string): Promise<OpenFileResult> {
  try {
    const buf = await readFile(filePath)
    const decoded = readTextFileFromBuffer(buf)
    if (!decoded.ok) {
      return {
        ok: false,
        code: decoded.code === 'BINARY_LIKELY' ? 'BINARY_LIKELY' : 'ENCODING_UNKNOWN',
        message: decoded.message,
        detail: decoded.message
      }
    }
    const warnLargeFile = buf.length > MAX_FILE_BYTES
    const warnLargeChars = decoded.text.length > MAX_MARKDOWN_CHARS
    return {
      ok: true,
      path: filePath,
      markdown: decoded.text,
      usedEncoding: decoded.encoding,
      warnLargeFile,
      warnLargeChars
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      return { ok: false, code: 'NOT_FOUND', message: 'File not found (ERR_NOT_FOUND)' }
    }
    if (code === 'EACCES') {
      return { ok: false, code: 'EACCES', message: 'Permission denied (ERR_EACCES)' }
    }
    return {
      ok: false,
      code: 'UNKNOWN',
      message: 'Failed to read file (ERR_READ)',
      detail: String(err)
    }
  }
}

ipcMain.handle('dialog:openFile', async () => {
  const r = await dialog.showOpenDialog({
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    properties: ['openFile']
  })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0]
})

ipcMain.handle('file:openPath', (_e, p: string) => openPathHandler(p))

ipcMain.handle('shell:openExternal', (_e, url: string) => {
  if (!/^https:\/\//i.test(url)) throw new Error('Blocked')
  return shell.openExternal(url)
})

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })
  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  const initial = extractFileArg(process.argv)
  if (initial) sendOpenToWindow(initial)
})
