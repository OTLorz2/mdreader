# 界面 UI 设计系统对齐（DESIGN.md + 预览页）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将渲染层界面（顶栏、大纲、阅读柱、空状态、错误态、底栏）重构为与根目录 `DESIGN.md` 及 `design-consultation-preview.html` 一致的字体、颜色 token、间距、圆角、纸张噪点与控件气质；**不**在应用内新增深色主题切换（与 `README.md`「默认浅色、不跟随系统深色」一致），但 CSS 可保留与预览页相同的变量命名以便日后扩展。

**Architecture:** 在 `index.html` 引入与预览页相同的 Google Fonts（`preconnect` + `display=swap`）。`styles.css` 用与预览页 `:root` 对齐的 CSS 变量替换当前 `--accent` / 旧间距命名，正文区使用 Source Serif 4、UI 使用 DM Sans、等宽使用 JetBrains Mono；`body::before` 叠加极低对比 SVG 噪点；布局改为 `body` 纵向 flex + `.shell { flex:1; min-height:0 }` 去除魔法数字的 `calc(100vh - 49px)`。大纲区增加可见「大纲」标题且 **不** 被 `buildOutline` 清空：将可滚动列表改为内层 `#outline` 容器。`main.ts` 将 Mermaid 主题固定为浅色 `default`，与产品策略一致。

**Tech Stack:** Electron 33+、electron-vite、TypeScript、Vitest、CSS、Google Fonts CDN（开发可接受；`DESIGN.md` 建议生产自托管 subset，本计划不新增构建步骤）。

---

## 文件结构（落地前分解）

| 路径 | 职责 |
|------|------|
| `tests/design-tokens.test.ts` | 断言 `styles.css` 含 DESIGN 约定 token（TDD 锚点） |
| `src/renderer/index.html` | 引入字体；大纲壳 + 内层 `#outline` 列表容器 |
| `src/renderer/src/styles.css` | 全量替换为设计系统 token、布局、组件样式 |
| `src/renderer/src/main.ts` | Mermaid 主题固定浅色；错误详情用 class 替代内联样式；必要时微调空文档文案容器 class |

---

### Task 1: 设计 token 回归测试（先失败）

**Files:**
- Create: `tests/design-tokens.test.ts`
- Modify: （无）

- [ ] **Step 1: 写入失败性测试（相对当前 `styles.css` 应失败）**

```typescript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/design-tokens.test.ts`
Expected: FAIL（当前 `styles.css` 仍为 `--accent`、`--space-1` 等，且无 `body::before` 噪点）

- [ ] **Step 3: Commit**

```bash
git add tests/design-tokens.test.ts
git commit -m "test: add design token assertions for styles.css"
```

---

### Task 2: 渲染入口 HTML — 字体与大纲结构

**Files:**
- Modify: `src/renderer/index.html`

- [ ] **Step 1: 将 `index.html` 全文替换为下列内容**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MarkdownReader</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <header id="top" class="topbar">
      <span id="title" class="title">MarkdownReader</span>
      <div class="actions">
        <button type="button" id="btn-open" class="btn btn-secondary" aria-label="打开文件">打开</button>
        <button type="button" id="btn-refresh" class="btn btn-secondary" aria-label="刷新">刷新</button>
      </div>
    </header>
    <div class="shell">
      <nav class="outline-shell" aria-label="大纲">
        <h2 class="outline-heading">大纲</h2>
        <div id="outline" class="outline"></div>
      </nav>
      <main id="main" class="main">
        <article id="article" class="article prose"></article>
      </main>
    </div>
    <footer id="status" class="statusbar hidden"></footer>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/index.html
git commit -m "feat(renderer): add design fonts and outline shell markup"
```

---

### Task 3: 全量替换 `styles.css`（使 Task 1 测试通过）

**Files:**
- Modify: `src/renderer/src/styles.css`

- [ ] **Step 1: 将 `styles.css` 全文替换为下列内容**

```css
:root {
  --bg: #f6f3ee;
  --surface: #fffef9;
  --surface-2: #faf7f0;
  --text: #1a1a1a;
  --muted: #5c5c5c;
  --border: #e0dcd4;
  --primary: #1b4965;
  --primary-hover: #163d55;
  --primary-fg: #f8f6f1;
  --secondary-fg: #1a1a1a;
  --success-bg: #e8f3ec;
  --success-border: #9dc7a8;
  --success-text: #1e4a2e;
  --warning-bg: #fdf6e7;
  --warning-border: #e8c46e;
  --warning-text: #7a4e00;
  --error-bg: #fcefef;
  --error-border: #e8a4a4;
  --error-text: #7f1d1d;
  --info-bg: #e8eef3;
  --info-border: #9eb4c8;
  --info-text: #1b4965;
  --shadow: 0 1px 2px rgba(26, 26, 26, 0.06), 0 8px 24px rgba(26, 26, 26, 0.06);
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --space-2xs: 2px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --outline-width: 260px;
  --font-ui: 'DM Sans', system-ui, sans-serif;
  --font-body: 'Source Serif 4', 'Georgia', serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 720px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.5;
  background-color: var(--bg);
  color: var(--text);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}

.topbar,
.shell,
.main > .article,
.statusbar {
  position: relative;
  z-index: 1;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.title {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  max-width: 60vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.btn {
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 600;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  min-height: 40px;
  transition:
    background 0.18s ease-out,
    border-color 0.18s ease-out,
    color 0.18s ease-out,
    transform 0.12s ease-out;
}

.btn:active {
  transform: scale(0.98);
}

.btn-secondary {
  background: var(--surface-2);
  color: var(--secondary-fg);
  border-color: var(--border);
}

.btn-secondary:hover {
  background: var(--surface);
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-fg);
  border-color: var(--primary);
}

.btn-primary:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.actions {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.shell {
  display: flex;
  flex: 1;
  min-height: 0;
}

.outline-shell {
  width: var(--outline-width);
  min-width: 200px;
  max-width: 400px;
  resize: horizontal;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--surface-2);
  flex-shrink: 0;
}

.outline-heading {
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
  padding: var(--space-md) var(--space-md) var(--space-sm);
  flex-shrink: 0;
}

.outline {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 var(--space-md) var(--space-md);
  font-family: var(--font-ui);
  font-size: 13px;
}

.outline button {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2xs);
  color: var(--muted);
  font-family: inherit;
  font-size: inherit;
  transition: background 0.15s ease-out, color 0.15s ease-out;
}

.outline button:hover {
  background: rgba(27, 73, 101, 0.06);
  color: var(--text);
}

.outline button.active {
  background: rgba(27, 73, 101, 0.12);
  color: var(--primary);
  font-weight: 600;
}

.outline button:focus-visible,
.btn:focus-visible,
.statusbar button:focus-visible,
.empty-state button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: var(--space-lg) var(--space-md);
  background: var(--bg);
}

.article {
  max-width: 42rem;
  margin: 0 auto;
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--text);
  background: var(--surface);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.article a {
  color: var(--primary);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.article a:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.article :where(h1, h2, h3, h4, h5, h6) {
  font-family: var(--font-body);
  text-wrap: balance;
  font-weight: 700;
  line-height: 1.25;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
}

.article h1 {
  font-size: clamp(1.75rem, 2.5vw, 2.25rem);
  margin-top: 0;
}

.article h2 {
  font-size: 1.5rem;
}

.article h3 {
  font-size: 1.25rem;
}

.article h4 {
  font-size: 1.125rem;
}

.article h5,
.article h6 {
  font-size: 1.0625rem;
}

.article p {
  margin: 0.75em 0;
}

.article :where(ul, ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.article li {
  margin: 0.25em 0;
}

.article pre {
  overflow: auto;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.875em;
  line-height: 1.5;
}

.article code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.article :not(pre) > code {
  padding: 0.12em 0.35em;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 0.92em;
}

.article blockquote {
  margin: 1em 0;
  padding-left: var(--space-md);
  border-left: 3px solid var(--border);
  color: var(--muted);
}

.article table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-family: var(--font-mono);
  font-size: 0.95em;
  font-variant-numeric: tabular-nums;
}

.article th,
.article td {
  border: 1px solid var(--border);
  padding: var(--space-sm) var(--space-md);
  vertical-align: top;
}

.article th {
  background: var(--surface-2);
  text-align: left;
  font-weight: 600;
}

.article img {
  max-width: 100%;
  height: auto;
}

.article hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: var(--space-lg) 0;
}

.statusbar {
  padding: var(--space-sm) var(--space-md);
  font-size: 12px;
  font-family: var(--font-ui);
  color: var(--muted);
  border-top: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.statusbar button {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  transition: background 0.18s ease-out;
}

.statusbar button:hover {
  background: var(--surface);
}

.hidden {
  display: none;
}

.error-card {
  padding: var(--space-lg);
  border: 1px solid var(--error-border);
  border-radius: var(--radius-md);
  color: var(--error-text);
  background: var(--error-bg);
  font-family: var(--font-ui);
  font-size: 14px;
}

.error-card strong {
  display: block;
  margin-bottom: var(--space-sm);
}

.error-detail {
  margin-top: var(--space-sm);
  white-space: pre-wrap;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--error-text);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--muted);
  font-family: var(--font-ui);
  font-size: 15px;
}

.empty-state .btn-primary {
  margin-top: var(--space-md);
}

.outline-empty {
  color: var(--muted);
  font-size: 13px;
  padding: var(--space-sm);
  font-family: var(--font-ui);
}

.article .mermaid {
  margin: 1rem 0;
  overflow-x: auto;
}

.article .mermaid svg {
  max-width: 100%;
  height: auto;
}
```

- [ ] **Step 2: 运行设计 token 测试**

Run: `npm test -- tests/design-tokens.test.ts`
Expected: PASS

- [ ] **Step 3: 运行全量测试**

Run: `npm test`
Expected: 全部 PASS（本任务不修改 `src/lib`）

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/styles.css
git commit -m "feat(renderer): align UI with DESIGN.md tokens and preview styles"
```

---

### Task 4: `main.ts` — Mermaid 浅色、错误详情 class、空状态主按钮

**Files:**
- Modify: `src/renderer/src/main.ts`

- [ ] **Step 1: 在 `mermaid.initialize` 中固定浅色主题**

将 `main.ts` 中 `mermaid.initialize` 调用从依赖 `prefers-color-scheme` 改为始终 `theme: 'default'`：

```typescript
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default'
    })
```

（仅替换 `theme` 那一行逻辑，删除对 `window.matchMedia('(prefers-color-scheme: dark)')` 的判断。）

- [ ] **Step 2: 空状态主按钮改为 `btn btn-primary`**

在 `renderEmptyState` 的模板字符串里，将：

```html
<button type="button" class="primary" id="btn-empty-open">
```

改为：

```html
<button type="button" class="btn btn-primary" id="btn-empty-open">
```

（与 Task 3 中 `.empty-state .btn-primary { margin-top: ... }` 对齐。）

- [ ] **Step 3: 错误详情使用 `.error-detail`，去掉内联样式**

在 `loadDocument` 中构造 `error-card` 的片段，将：

```typescript
${result.detail ? `<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(result.detail)}</pre>` : ''}
```

改为：

```typescript
${result.detail ? `<pre class="error-detail">${escapeHtml(result.detail)}</pre>` : ''}
```

- [ ] **Step 4: 手动冒烟（无自动化 E2E 时）**

Run: `npm run dev`
检查项：
1. 顶栏「打开 / 刷新」为 secondary 按钮气质，hover 有短暂过渡。
2. 左侧「大纲」标题为大写密排标签；有标题时列表可滚动；当前节高亮为墨水蓝底纹。
3. 正文为衬线、链接为 `#1b4965`，代码为 JetBrains Mono；纸张背景有极轻噪点。
4. 打开含 Mermaid 的文档时图表为浅色主题（非深色）。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/main.ts
git commit -m "fix(renderer): light mermaid theme and semantic error detail styling"
```

---

## Self-Review（计划自检）

**1. Spec coverage（对照用户请求 + DESIGN.md + 预览页）**

| 要求 | 对应任务 |
|------|----------|
| 字体：DM Sans / Source Serif 4 / JetBrains Mono | Task 2 + Task 3 |
| 颜色：Ink 主色、暖灰纸感、语义色 error 等 | Task 3 |
| 间距与圆角 token | Task 3 + Task 1 测试 |
| 纸张噪点 | Task 3 + Task 1 测试 |
| 阅读柱 max-width ~42rem | Task 3 |
| 控件与预览 `.btn-secondary` / `.btn-primary` 一致 | Task 2–3 |
| 大纲区密度与 active 态接近预览 mock | Task 3 |
| README：不跟随系统深色、默认浅色 | Task 4（Mermaid）；不实现应用内深色切换 |

**无覆盖（刻意超出本次范围）**

- 应用内深色主题 / `data-theme`：README 与 DESIGN 决策表留给产品后续；若要做，应单开计划并同步 WCAG。
- 生产环境字体自托管：DESIGN.md 建议，本计划沿用预览页 CDN。

**2. Placeholder scan**

无 TBD /「适当处理」类步骤；代码块为完整片段。

**3. Type consistency**

仅 HTML class 与 CSS 选择器对齐；`#outline` 仍为 `buildOutline` 挂载点，仅父级从 `nav` 改为 `.outline-shell` 包裹，**不改变** `document.querySelector('#outline')` 的语义（仍指向列表容器）。

---

## Execution Handoff

**计划已保存至 `docs/superpowers/plans/2026-04-06-ui-design-system-refactor.md`。执行方式二选一：**

**1. Subagent-Driven（推荐）** — 每个 Task 派生子代理，Task 之间人工快速 review，迭代快。

**2. Inline Execution** — 在本会话用 executing-plans 按批次执行并设检查点。

**你希望采用哪一种？**
