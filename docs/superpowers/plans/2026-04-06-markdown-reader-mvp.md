# Markdown 专注阅读器 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Windows 上交付可安装/便携的 Electron 应用：双击或 CLI 打开 `.md`，GFM 子集安全渲染、左侧 ATX 大纲与锚点跳转、浅色纸张感阅读布局，并满足设计文档中的边界行为与安全默认。

**Architecture:** 主进程负责 `argv` 解析、系统对话框、`fs` 读文件与编码探测、体积阈值与二进制粗检；通过 `contextBridge` 暴露窄 IPC；渲染进程用 **unified + remark/rehype** 生成带 `rehype-slug` 的 HTML，大纲从同一 MD 用 **remark 解析 + github-slugger** 生成以保证 id 与正文一致；相对图片在主进程解析为 `file://` URL 后写入 HTML 或在渲染期注入 `base`（计划采用渲染前由主进程传入 `baseDir`，在 hast 阶段改写 `img.src`）。Windows 分发用 **electron-builder** 的 `fileAssociations` + 文档中的关联/回滚说明。

**Tech Stack:** Electron 33+、electron-vite 3、TypeScript、Vite、Vitest、unified、remark-parse、remark-gfm、remark-rehype、rehype-stringify、rehype-sanitize、rehype-slug、unist-util-visit、mdast-util-to-string、github-slugger、chardet、iconv-lite、electron-builder。

---

## 文件结构（落地前分解）

| 路径 | 职责 |
|------|------|
| `package.json` | 脚本、`build.fileAssociations`、依赖 |
| `electron.vite.config.ts` | electron-vite 主/预加载/渲染构建 |
| `tsconfig.json` / `tsconfig.node.json` / `tsconfig.web.json` | TS 工程引用（随 electron-vite 模板） |
| `src/main/index.ts` | 应用生命周期、BrowserWindow、`argv`、`dialog`、读文件、IPC handler |
| `src/preload/index.ts` | `contextBridge` 暴露 `api` |
| `src/preload/index.d.ts` | 预加载 API 类型供渲染进程 import |
| `src/renderer/index.html` | 单页壳：顶栏 / 左栏大纲 / 主阅读区 / 可选底栏 |
| `src/renderer/src/main.ts` | 挂载 UI、状态机、监听 IPC、大纲点击滚动、外链拦截 |
| `src/renderer/src/styles.css` | 浅色纸张 token、定宽正文列、大纲密度 |
| `src/shared/constants.ts` | `MAX_FILE_BYTES`、`MAX_CHARS`、与设计阈值一致 |
| `src/shared/types.ts` | `OpenResult`、`OutlineItem` 等 |
| `src/lib/extract-outline.ts` | 从 Markdown 提取 ATX 大纲（remark AST） |
| `src/lib/render-markdown.ts` | Markdown → 安全 HTML（rehype 管道 + 图片路径改写） |
| `src/lib/read-text-file.ts` | Buffer → UTF-8 / chardet+iconv、二进制粗检 |
| `src/lib/is-probably-binary.ts` | 空缓冲、NUL 占比等启发式 |
| `fixtures/.gitkeep` | 占位；三份脱敏样本由 Assignment 放入 |
| `tests/extract-outline.test.ts` | 大纲深度、重复标题 slug、无标题 |
| `tests/render-markdown.test.ts` | GFM 表格/任务列表、无脚本、无原始 HTML |
| `tests/read-text-file.test.ts` | UTF-8、非法序列、iconv 路径（fixture 字节） |
| `vitest.config.ts` | Vitest + 仅针对 `src/lib` 与 `tests` |
| `README.md` | Electron 选型一段话、关联配置与回滚、浅色主题说明、长样本上限 |
| `docs/adr-001-electron.md` | 可选：ADR 片段（与 README 二选一或并存） |

---

### Task 1: 脚手架与依赖锁定

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `src/main/index.ts`（占位 `console.log`）
- Create: `src/preload/index.ts`（空 `contextBridge`）
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.ts`（`document.body.textContent = 'ok'`）

- [ ] **Step 1: 写入 `package.json`**

```json
{
  "name": "playground7-markdown-reader",
  "version": "0.1.0",
  "description": "Internal Markdown reader — read-first, outline, Windows association",
  "type": "module",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "dist": "electron-vite build && electron-builder --win"
  },
  "dependencies": {
    "chardet": "^2.0.0",
    "github-slugger": "^2.0.0",
    "iconv-lite": "^0.6.3",
    "mdast-util-to-string": "^4.0.0",
    "remark-gfm": "^4.0.0",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.0.0",
    "rehype-sanitize": "^6.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-stringify": "^10.0.0",
    "unified": "^11.0.0",
    "unist-util-visit": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "electron-vite": "^3.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  },
  "build": {
    "appId": "com.internal.markdown.reader",
    "productName": "MarkdownReader",
    "directories": { "output": "release" },
    "files": ["out/**/*", "package.json"],
    "win": {
      "target": ["nsis", "zip"],
      "artifactName": "${productName}-${version}-${os}-${arch}.${ext}"
    },
    "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true },
    "fileAssociations": [
      {
        "ext": "md",
        "name": "Markdown Document",
        "description": "Markdown document",
        "role": "Editor"
      }
    ]
  }
}
```

- [ ] **Step 2: 写入 `electron.vite.config.ts`**

仅使用 electron-vite 内置能力，不添加未列入 `package.json` 的 Vite 插件。

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    }
  }
})
```

- [ ] **Step 3: 用官方模板对齐 TS 配置（推荐）**

运行：`npm create @quick-start/electron@latest` 在临时目录生成项目，将生成的 `tsconfig.json`、`tsconfig.node.json`、`tsconfig.web.json` 复制到本仓库并合并路径为 `src/main`、`src/preload`、`src/renderer`。若不用交互模板，则采用 electron-vite 文档中的三文件最小 `tsconfig` 片段，确保 `moduleResolution: "bundler"`、`strict: true`。

- [ ] **Step 4: 安装依赖**

运行：`npm install`

预期：无 peer 冲突；若有 `electron` 下载慢，设置 `ELECTRON_MIRROR` 后重试。

- [ ] **Step 5: 最小主进程 / 预加载 / 渲染占位**

`src/main/index.ts`:

```typescript
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true
    }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
```

`src/preload/index.ts`:

```typescript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('readerApi', {})
```

`src/renderer/index.html`: 标准 html，`<script type="module" src="./src/main.ts"></script>`

`src/renderer/src/main.ts`:

```typescript
document.body.innerHTML = '<p id="boot">boot</p>'
```

- [ ] **Step 6: 验证开发启动**

运行：`npm run dev`

预期：窗口打开，可见 `boot`。

- [ ] **Step 7: Commit**

```bash
git add package.json electron.vite.config.ts tsconfig*.json src/main/index.ts src/preload/index.ts src/renderer/index.html src/renderer/src/main.ts
git commit -m "chore: scaffold electron-vite typescript shell"
```

---

### Task 2: 共享常量与类型

**Files:**
- Create: `src/shared/constants.ts`
- Create: `src/shared/types.ts`

- [ ] **Step 1: 写入常量（与设计阈值一致）**

`src/shared/constants.ts`:

```typescript
/** 与设计文档「长样本」阈值一致；超过则横幅提示可能卡顿 */
export const MAX_FILE_BYTES = 512 * 1024
export const MAX_MARKDOWN_CHARS = 50_000
```

- [ ] **Step 2: 写入类型**

`src/shared/types.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/constants.ts src/shared/types.ts
git commit -m "feat: add shared limits and open-file types"
```

---

### Task 3: `extract-outline`（TDD）

**Files:**
- Create: `src/lib/extract-outline.ts`
- Create: `tests/extract-outline.test.ts`
- Modify: `vitest.config.ts`（若尚无则创建）

- [ ] **Step 1: 添加 Vitest 配置**

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})
```

- [ ] **Step 2: 写失败测试**

`tests/extract-outline.test.ts`:

```typescript
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
```

- [ ] **Step 3: 运行测试确认失败**

运行：`npx vitest run tests/extract-outline.test.ts`

预期：`FAIL` — `extractOutline` 未定义或模块不存在。

- [ ] **Step 4: 最小实现**

`src/lib/extract-outline.ts`:

```typescript
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
```

- [ ] **Step 5: 运行测试确认通过**

运行：`npx vitest run tests/extract-outline.test.ts`

预期：全部 `PASS`。

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/lib/extract-outline.ts tests/extract-outline.test.ts
git commit -m "feat: extract ATX outline with GitHub-compatible slugs"
```

---

### Task 4: `render-markdown`（TDD，GFM + 消毒 + slug）

**Files:**
- Create: `src/lib/render-markdown.ts`
- Create: `tests/render-markdown.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/render-markdown.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { renderMarkdownToHtml } from '../src/lib/render-markdown'

describe('renderMarkdownToHtml', () => {
  it('renders GFM table', async () => {
    const md = '|a|b|\n|-|-|\n|1|2|\n'
    const html = await renderMarkdownToHtml(md, { baseDir: null })
    expect(html).toContain('<table>')
    expect(html).toContain('1')
  })

  it('does not pass through raw script tags from HTML blocks', async () => {
    const md = '<script>alert(1)</script>\n\n# Hi'
    const html = await renderMarkdownToHtml(md, { baseDir: null })
    expect(html.toLowerCase()).not.toContain('<script')
  })

  it('adds id to heading for slug navigation', async () => {
    const html = await renderMarkdownToHtml('# Title\n', { baseDir: null })
    expect(html).toContain('id="title"')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

运行：`npx vitest run tests/render-markdown.test.ts`

预期：`FAIL`。

- [ ] **Step 3: 实现渲染管道**

`src/lib/render-markdown.ts`:

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { Element, Root as HastRoot } from 'hast'
import { pathToFileURL } from 'url'
import { resolve, isAbsolute } from 'path'

export type RenderOptions = {
  baseDir: string | null
}

const schema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), 'http', 'https', 'file', 'data'],
    href: [...(defaultSchema.protocols?.href ?? []), 'http', 'https', 'file', 'mailto']
  }
}

function rewriteImageSrc(tree: HastRoot, baseDir: string | null): void {
  if (!baseDir) return
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'img') return
    const src = node.properties?.src
    if (typeof src !== 'string' || src.length === 0) return
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return
    const abs = isAbsolute(src) ? src : resolve(baseDir, src)
    node.properties = { ...node.properties, src: pathToFileURL(abs).href }
  })
}

export async function renderMarkdownToHtml(
  markdown: string,
  options: RenderOptions
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(() => (tree: HastRoot) => {
      rewriteImageSrc(tree, options.baseDir)
    })
    .use(rehypeSlug)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown)
  return String(file)
}
```

- [ ] **Step 4: 运行测试**

运行：`npx vitest run tests/render-markdown.test.ts`

预期：`PASS`。若 `rehype-sanitize` 剥离 `id`，调整 schema 在 `attributes` 中允许 heading 的 `id`（查阅 `rehype-sanitize` 默认是否保留 `id`；若测试失败则扩展 `tagNames` / `attributes` 含 `h1`–`h6` 的 `id`）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/render-markdown.ts tests/render-markdown.test.ts
git commit -m "feat: GFM render with slug, sanitize, and local image paths"
```

---

### Task 5: 读文件与编码（TDD）

**Files:**
- Create: `src/lib/is-probably-binary.ts`
- Create: `src/lib/read-text-file.ts`
- Create: `tests/read-text-file.test.ts`

- [ ] **Step 1: 二进制启发式测试 + 实现**

`tests/read-text-file.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isProbablyBinary } from '../src/lib/is-probably-binary'

describe('isProbablyBinary', () => {
  it('detects NUL as binary', () => {
    expect(isProbablyBinary(Buffer.from([0x48, 0x00, 0x49]))).toBe(true)
  })
  it('allows utf8 text', () => {
    expect(isProbablyBinary(Buffer.from('# hello 中文', 'utf8'))).toBe(false)
  })
})
```

`src/lib/is-probably-binary.ts`:

```typescript
export function isProbablyBinary(buf: Buffer): boolean {
  if (buf.length === 0) return false
  let zero = 0
  const sample = buf.subarray(0, Math.min(buf.length, 8000))
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) zero++
  }
  if (zero > 0) return true
  return false
}
```

运行：`npx vitest run tests/read-text-file.test.ts`

预期：`PASS`（仅二进制部分时）。

- [ ] **Step 2: 扩展测试 `readTextFileFromPath`（使用临时文件）**

在 `tests/read-text-file.test.ts` 追加：

```typescript
import { readTextFileFromBuffer } from '../src/lib/read-text-file'

describe('readTextFileFromBuffer', () => {
  it('reads utf-8', () => {
    const r = readTextFileFromBuffer(Buffer.from('# hi', 'utf8'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('# hi')
  })
})
```

`src/lib/read-text-file.ts`:

```typescript
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
```

运行：`npx vitest run tests/read-text-file.test.ts`

预期：`PASS`。

- [ ] **Step 3: Commit**

```bash
git add src/lib/is-probably-binary.ts src/lib/read-text-file.ts tests/read-text-file.test.ts
git commit -m "feat: UTF-8 strict read with chardet fallback and binary guard"
```

---

### Task 6: 预加载 API 与主进程 IPC

**Files:**
- Modify: `src/preload/index.ts`
- Create: `src/preload/index.d.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: 定义 `contextBridge` API**

`src/preload/index.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { OpenFileResult } from '../shared/types'

contextBridge.exposeInMainWorld('readerApi', {
  openFileDialog: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFile'),
  openPath: (path: string): Promise<OpenFileResult> =>
    ipcRenderer.invoke('file:openPath', path),
  onFileOpenRequested: (cb: (path: string) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, p: string) => cb(p)
    ipcRenderer.on('app:open-file', listener)
    return () => ipcRenderer.removeListener('app:open-file', listener)
  }
})
```

`src/preload/index.d.ts`:

```typescript
import type { OpenFileResult } from '../shared/types'

export interface ReaderApi {
  openFileDialog: () => Promise<string | null>
  openPath: (path: string) => Promise<OpenFileResult>
  onFileOpenRequested: (cb: (path: string) => void) => () => void
}

declare global {
  interface Window {
    readerApi: ReaderApi
  }
}
```

- [ ] **Step 2: 主进程实现 IPC 与 `second-instance` / `open-file`**

在 `src/main/index.ts` 中（保持 `createWindow`，补充以下逻辑；路径与导入按你文件实际调整）：

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { MAX_FILE_BYTES, MAX_MARKDOWN_CHARS } from '../shared/constants'
import type { OpenFileResult } from '../shared/types'
import { readTextFileFromBuffer } from '../lib/read-text-file'

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
  const skip = new Set(['.', '--'])
  const tail = argv.slice(1).filter((x) => !x.startsWith('-') && !skip.has(x))
  const last = tail[tail.length - 1]
  return last && last.endsWith('.md') ? last : tail[0] ?? null
}

function sendOpenToWindow(filePath: string): void {
  const w = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  w?.webContents.send('app:open-file', filePath)
}

async function openPathHandler(filePath: string): Promise<OpenFileResult> {
  try {
    const buf = await readFile(filePath)
    if (buf.length > MAX_FILE_BYTES) {
      /* 仍打开，但标记 warn；与设计「二选一」此处选「仍打开 + 警告」 */
    }
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
```

在 `app.whenReady().then(() => { createWindow(); const initial = extractFileArg(process.argv); if (initial) sendOpenToWindow(initial) })` 中调用初始路径。

注意：`extractFileArg` 在开发模式下需跳过 `electron-vite` / `electron` 占位参数；若实测 `argv` 不符，以调试打印为准修正过滤逻辑。

- [ ] **Step 3: 手动验证**

运行：`npm run dev`，在渲染控制台执行 `window.readerApi.openPath('fixtures/sample.md')`（先放一份 UTF-8 md）。

预期：返回 `ok: true` 或清晰 `NOT_FOUND`。

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/preload/index.d.ts src/main/index.ts
git commit -m "feat: IPC to open markdown with size warnings and encoding errors"
```

---

### Task 7: 渲染进程 UI — 布局、状态、交互

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/src/main.ts`
- Create: `src/renderer/src/styles.css`

- [ ] **Step 1: HTML 结构（顶栏 / 左栏 / 主区 / 底栏）**

`src/renderer/index.html`  body 内：

```html
<header id="top" class="topbar">
  <span id="title" class="title">MarkdownReader</span>
  <div class="actions">
    <button type="button" id="btn-open" aria-label="打开文件">打开</button>
    <button type="button" id="btn-refresh" aria-label="刷新">刷新</button>
  </div>
</header>
<div class="shell">
  <nav id="outline" class="outline" aria-label="大纲"></nav>
  <main id="main" class="main">
    <article id="article" class="article prose"></article>
  </main>
</div>
<footer id="status" class="statusbar hidden"></footer>
<script type="module" src="./src/main.ts"></script>
```

- [ ] **Step 2: 样式（浅色纸张、65–72ch、大纲 240–280px）**

`src/renderer/src/styles.css`（节选，工程师可补全 token，但必须包含）：

```css
:root {
  --bg: #f6f3ee;
  --surface: #fffef9;
  --text: #1a1a1a;
  --muted: #5c5c5c;
  --border: #e0dcd4;
  --accent: #2563eb;
  --danger: #b91c1c;
  --outline-width: 260px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --radius: 6px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-width: 720px;
  min-height: 480px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.title { font-size: 14px; max-width: 60vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.actions button { margin-left: var(--space-2); min-width: 44px; min-height: 44px; }
.shell { display: flex; height: calc(100vh - 49px); }
.outline {
  width: var(--outline-width);
  min-width: 200px;
  max-width: 400px;
  resize: horizontal;
  overflow: auto;
  border-right: 1px solid var(--border);
  padding: var(--space-3);
  background: var(--surface);
  font-size: 13px;
}
.outline button {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius);
}
.outline button:hover { background: rgba(0,0,0,0.04); }
.outline button.active { box-shadow: inset 3px 0 0 var(--accent); }
.main { flex: 1; overflow: auto; padding: var(--space-4); }
.article {
  max-width: 72ch;
  margin: 0 auto;
  font-size: 16px;
  line-height: 1.65;
  background: var(--surface);
  padding: var(--space-4);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}
.article a { text-decoration: underline; color: var(--accent); }
.statusbar { padding: var(--space-2) var(--space-3); font-size: 12px; color: var(--muted); border-top: 1px solid var(--border); }
.hidden { display: none; }
.error-card { padding: var(--space-4); border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); background: #fff5f5; }
```

- [ ] **Step 3: `main.ts` 逻辑（合并以下行为）**

`src/renderer/src/main.ts` 必须实现：

1. `import './styles.css'`
2. `loadDocument(path: string)`：`await window.readerApi.openPath(path)`；错误时主区显示 `.error-card` + 英文错误码；成功则 `renderMarkdownToHtml` + `extractOutline`，填充 `#article` 与 `#outline`。
3. 顶栏标题：basename + `title` 上 `tooltip` 全路径。
4. 大纲：每项 `button`，`padding-left` 按 `(depth-1)*12px`；点击 `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`（与「第一个匹配」一致）。
5. 主区滚动：用 `IntersectionObserver` 或 `scroll` 节流，给当前可见标题对应大纲项加 `active`。
6. 外链：在 `#article` 上 `click` 委托，`preventDefault`；若 `https:` 则 `window.readerApi.openExternal`（需在 preload 增加 `openExternal` 并用 `shell.openExternal`）；`http:` / 其他 scheme：显示底栏或 `alert` 风格非阻塞提示「已阻止打开 xxx (ERR_LINK_POLICY)」+ 提供复制（可用 `navigator.clipboard`）。
7. `btn-open` → `openFileDialog` → `loadDocument`；`btn-refresh` → 重新 `openPath` 当前路径。
8. 无路径启动：主区空态——主按钮仅「选择 Markdown」+ 中文说明一句；空文件：「这份文档是空的」；无标题：左栏「本文无 ATX 标题」。

`preload` 需补充：

```typescript
openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
```

主进程：

```typescript
import { shell } from 'electron'
ipcMain.handle('shell:openExternal', (_e, url: string) => {
  if (!/^https:\/\//i.test(url)) throw new Error('Blocked')
  return shell.openExternal(url)
})
```

- [ ] **Step 4: 键盘快捷键**

在渲染进程监听 `keydown`：`Ctrl+O` 触发打开；`F5` 或 `Ctrl+R` 触发刷新（`preventDefault` 避免浏览器硬刷新）。

- [ ] **Step 5: 手动冒烟**

运行：`npm run dev`，验证空态、打开、大纲跳转、https 外链。

- [ ] **Step 6: Commit**

```bash
git add src/renderer/index.html src/renderer/src/main.ts src/renderer/src/styles.css src/preload/index.ts src/main/index.ts
git commit -m "feat: reader UI with outline, states, and safe external links"
```

---

### Task 8: Windows 打包、图标、README 与验收文档

**Files:**
- Modify: `package.json`（`build.icon`）
- Create: `build/.gitkeep` 或 `resources/icon.ico`（占位说明）
- Modify: `README.md`

- [ ] **Step 1: 准备 `icon.ico`**

将合法 `.ico` 置于 `build/icon.ico`，并在 `package.json` 的 `build` 下增加：

```json
"icon": "build/icon.ico"
```

- [ ] **Step 2: 打包**

运行：`npm run dist`

预期：`release/` 下出现 `.exe` 与 `.zip`。

- [ ] **Step 3: CLI 验证**

```powershell
& ".\release\MarkdownReader-0.1.0-win-x64.exe" "C:\path\to\sample.md"
```

预期：打开并渲染。

- [ ] **Step 4: README 必含段落（中文 + 错误码英文）**

`README.md` 至少包含：

1. **Electron 选型**（3–5 句）：Windows 关联与两周试用、团队前端栈、分发模板；未来可评估 Tauri 为 v2。
2. **默认浅色阅读主题**：不跟随系统深色，一行说明。
3. **文件关联**：安装器关联步骤；回滚：Windows 设置 → 应用 → 默认应用 → 按文件类型选择 `.md` 恢复。
4. **上限**：`MAX_FILE_BYTES` / `MAX_MARKDOWN_CHARS` 数值与「可能卡顿」说明。
5. **已知限制**：重复标题锚点为第一个匹配；Setext 不在大纲；数学公式/Mermaid 非 v1。
6. **试用记录**：三人每周≥3 次可用手动日志模板（日期、次数、省时一句话）。

- [ ] **Step 5: `fixtures` 与 checklist**

创建 `fixtures/README.md` 说明三份脱敏样本命名约定；checklist 表头包含：代码块、表格、任务列表、相对图片、锚点、重复标题、长文滚动。

- [ ] **Step 6: Commit**

```bash
git add package.json README.md fixtures/README.md build/icon.ico
git commit -m "docs: Windows dist, file association notes, and fixture checklist"
```

---

## 规格自检（Self-Review）

**1. Spec coverage**

| 需求来源 | 对应 Task |
|----------|-----------|
| Electron、阅读优先、GFM 子集、ATX 大纲 | Task 1, 3, 4, 7 |
| 安全：无 HTML/消毒、https 外链、http 降级 | Task 4, 7 |
| 相对图片基目录 | Task 4 |
| CLI + 双击（关联） | Task 1 `fileAssociations`、Task 6 `argv`/`open-file`、Task 8 |
| 空/不存在/编码/大二进制/大文件 | Task 5, 6, 7 |
| 浅色纸张 UI、顶栏/左栏/主栏、底栏可选、键盘 | Task 7 |
| README/ADR Electron 理由 | Task 8 |
| 三份样本 + checklist | Task 8 + 仓库外 Assignment（`fixtures`） |
| 手动刷新 / 文件变更 v1 不自动热重载 | Task 7 刷新按钮（显式不实现 chokidar） |

**2. Placeholder scan：** 已避免 TBD；`electron.vite.config.ts` 中若未使用 static-copy 须删除多余 import（已在 Step 2 注明）。

**3. Type consistency：** `OpenFileResult`、`OutlineItem`、`readerApi` 与 IPC 名称在 Task 6–7 保持一致；错误码字符串与 README 一致。

**缺口（非代码）：** 启动门禁（签名/MSI）由 `TODOS.md` P0 项在 M0 结束确认；计划不替代与 IT 对齐。

---

## Execution Handoff

**计划已保存至** `docs/superpowers/plans/2026-04-06-markdown-reader-mvp.md`。

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理，任务间人工复核，迭代快。  
2. **Inline Execution** — 本会话用 executing-plans 按批次执行并设检查点。

**你希望采用哪一种？**

若选 Subagent-Driven：**必须**配合使用 superpowers:subagent-driven-development（每个 Task 新子代理 + 两阶段审查）。  
若选 Inline：**必须**配合使用 superpowers:executing-plans。
