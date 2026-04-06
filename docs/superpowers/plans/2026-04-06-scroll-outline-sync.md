# Scroll + Outline Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 正文滚动时顶栏保持固定可见；左侧大纲高亮当前章节，并在允许时自动将当前项垂直居中；用户主动滚动大纲则暂停自动居中，直到用户滚动正文或点击大纲跳转。

**Architecture:** 用单一数据源计算「当前章节」id（移除 IntersectionObserver 与滚动回调的重复逻辑），抽成 `src/lib/` 内可单元测试的纯函数。大纲自动滚动通过设置 `#outline.scrollTop` 并配合 `suppress` 标志区分程序滚动与用户滚动。必要时用 `html/body` 的 `overflow` 约束消灭窗口级滚动，保证顶栏不随页面卷动。

**Tech Stack:** TypeScript、Vitest（`environment: node` + 纯函数测试）、Electron 渲染进程 `main.ts`、`styles.css`。

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/active-heading.ts`（新建） | 根据主滚动区内各标题与主容器视口几何关系，计算当前应对应的标题 `id`。 |
| `src/lib/outline-scroll.ts`（新建） | 根据滚动容器与条目几何尺寸，计算将子元素垂直居中所需的 `scrollTop`（纯数学，便于测试）。 |
| `tests/active-heading.test.ts`（新建） | 覆盖 `active-heading` 的边界情况。 |
| `tests/outline-scroll.test.ts`（新建） | 覆盖 `outline-scroll` 的 clamp 与居中公式。 |
| `src/renderer/src/main.ts`（修改） | 删除 `IntersectionObserver` 与重复的 `onMainScroll` 高亮逻辑；调用上述库函数；实现大纲自动滚动与用户滚动门控；文档加载/刷新时重置门控。 |
| `src/renderer/src/styles.css`（修改） | 必要时约束 `html, body` 高度与 `overflow`，防止窗口级滚动顶走顶栏。 |

---

### Task 1: `computeActiveHeadingId` 纯函数与测试

**Files:**
- Create: `src/lib/active-heading.ts`
- Create: `tests/active-heading.test.ts`

**Behavior（与当前 `onMainScroll` 意图一致，但可测）：** 输入为若干标题的视口矩形 `top/bottom`（`getBoundingClientRect()`）、主滚动区上沿 `mainTop`、以及「读线」偏移 `readLineOffset`（沿用现有魔法数 `12`）。在所有满足 `bottom > mainTop` 的标题中，选取 `abs(top - mainTop - readLineOffset)` 最小者；若无标题或均无有效 `id`，返回 `null`。

- [ ] **Step 1: Write the failing test**

`tests/active-heading.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeActiveHeadingId } from '../src/lib/active-heading'

describe('computeActiveHeadingId', () => {
  it('returns null for empty headings', () => {
    expect(computeActiveHeadingId([], 0, 12)).toBeNull()
  })

  it('picks heading closest to read line among those below mainTop', () => {
    const mainTop = 100
    const headings = [
      { id: 'a', top: 80, bottom: 95 },
      { id: 'b', top: 105, bottom: 140 }
    ]
    // b: bottom > mainTop, dist = |105 - 100 - 12| = 7
    expect(computeActiveHeadingId(headings, mainTop, 12)).toBe('b')
  })

  it('ignores headings fully above mainTop', () => {
    const mainTop = 100
    const headings = [{ id: 'x', top: 40, bottom: 90 }]
    expect(computeActiveHeadingId(headings, mainTop, 12)).toBeNull()
  })

  it('breaks ties by smaller distance (first match wins if equal)', () => {
    const mainTop = 0
    const headings = [
      { id: 'first', top: 20, bottom: 50 },
      { id: 'second', top: 20, bottom: 50 }
    ]
    const d = Math.abs(20 - 0 - 12)
    expect(d).toBe(8)
    expect(computeActiveHeadingId(headings, mainTop, 12)).toBe('first')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/active-heading.test.ts`

Expected: FAIL（模块或函数不存在）。

- [ ] **Step 3: Write minimal implementation**

`src/lib/active-heading.ts`:

```typescript
export type HeadingRect = { id: string; top: number; bottom: number }

export function computeActiveHeadingId(
  headings: HeadingRect[],
  mainTop: number,
  readLineOffset: number
): string | null {
  let best: HeadingRect | null = null
  let bestDist = Infinity
  for (const h of headings) {
    if (!h.id) continue
    if (h.bottom <= mainTop) continue
    const dist = Math.abs(h.top - mainTop - readLineOffset)
    if (dist < bestDist) {
      bestDist = dist
      best = h
    }
  }
  return best?.id ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/active-heading.test.ts`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/active-heading.ts tests/active-heading.test.ts
git commit -m "feat: add computeActiveHeadingId for scroll sync"
```

---

### Task 2: `computeOutlineScrollTopToCenter` 纯函数与测试

**Files:**
- Create: `src/lib/outline-scroll.ts`
- Create: `tests/outline-scroll.test.ts`

**公式：** 设 `maxScroll = max(0, scrollHeight - clientHeight)`，`ideal = contentY + itemHeight/2 - clientHeight/2`，其中 `contentY` 为当前项在滚动内容顶部以上的距离（等价于「项顶部相对滚动容器内容区」）。返回 `clamp(ideal, 0, maxScroll)`。

- [ ] **Step 1: Write the failing test**

`tests/outline-scroll.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeOutlineScrollTopToCenter } from '../src/lib/outline-scroll'

describe('computeOutlineScrollTopToCenter', () => {
  it('centers item when possible', () => {
    // client 100, item at 40..60 (height 20), contentY = 40
    // ideal = 40 + 10 - 50 = 0
    expect(computeOutlineScrollTopToCenter(100, 500, 40, 20)).toBe(0)
  })

  it('clamps to max scroll', () => {
    // small scroll range: maxScroll = 10
    expect(computeOutlineScrollTopToCenter(100, 110, 200, 20)).toBe(10)
  })

  it('clamps to 0 when item near top', () => {
    expect(computeOutlineScrollTopToCenter(100, 120, 0, 20)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/outline-scroll.test.ts`

Expected: FAIL。

- [ ] **Step 3: Write minimal implementation**

`src/lib/outline-scroll.ts`:

```typescript
export function computeOutlineScrollTopToCenter(
  clientHeight: number,
  scrollHeight: number,
  itemContentY: number,
  itemHeight: number
): number {
  const maxScroll = Math.max(0, scrollHeight - clientHeight)
  const ideal = itemContentY + itemHeight / 2 - clientHeight / 2
  return Math.max(0, Math.min(ideal, maxScroll))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/outline-scroll.test.ts`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/outline-scroll.ts tests/outline-scroll.test.ts
git commit -m "feat: add outline scrollTop helper for centering active item"
```

---

### Task 3: 渲染进程接线 — 单一滚动源、大纲居中、用户滚动门控

**Files:**
- Modify: `src/renderer/src/main.ts`
- Modify: `src/renderer/src/styles.css`

**门控规则（与需求对齐）：**

- `outlineAutoScrollEnabled`，初始 `true`；打开/刷新文档后设为 `true`。
- 程序设置 `elOutline.scrollTop` 前设 `suppressOutlineScroll = true`，在下一帧或 `queueMicrotask` 后清回 `false`。
- `elOutline` 监听 `scroll`：若 `suppressOutlineScroll` 则忽略；否则视为用户滚动大纲 → `outlineAutoScrollEnabled = false`。
- `elMain` 的 `onMainScroll`：将 `outlineAutoScrollEnabled = true`；计算当前 id 并 `setOutlineActive`；若 `outlineAutoScrollEnabled`（在赋回 true 之后始终为 true）且存在对应按钮，则计算 `contentY = elOutline.scrollTop + (btnRect.top - outlineRect.top)`，调用 `computeOutlineScrollTopToCenter(elOutline.clientHeight, elOutline.scrollHeight, contentY, btnRect.height)`，再 `suppress` + 赋值 `scrollTop`。

注意：`onMainScroll` 里应先处理门控恢复，再读按钮几何；点击大纲跳转时除 `scrollIntoView` 外将 `outlineAutoScrollEnabled = true` 并可在跳转后调用一次与滚动相同的居中逻辑（或依赖随后触发的 scroll 事件；为简单起见，在 `click` 回调末尾 `requestAnimationFrame` 内执行一次居中并 `suppress`）。

**移除：** `setupOutlineScrollSpy`、`observer` 变量、`IntersectionObserver` 整块；`loadDocument` 内对 `setupOutlineScrollSpy` 的调用。

**新增 import：**

```typescript
import { computeActiveHeadingId } from '../../lib/active-heading'
import { computeOutlineScrollTopToCenter } from '../../lib/outline-scroll'
```

**`onMainScroll` 主体（替换现有函数体，保留 RAF 节流）：**

```typescript
const READ_LINE_OFFSET = 12

let outlineAutoScrollEnabled = true
let suppressOutlineScroll = false

function setOutlineScrollTopProgrammatic(value: number): void {
  suppressOutlineScroll = true
  elOutline.scrollTop = value
  requestAnimationFrame(() => {
    suppressOutlineScroll = false
  })
}

function syncOutlineScrollToActive(id: string | null): void {
  if (!id || !outlineAutoScrollEnabled) return
  const btn = elOutline.querySelector(`button[data-anchor-id="${CSS.escape(id)}"]`) as HTMLButtonElement | null
  if (!btn) return
  const outlineRect = elOutline.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  const contentY = elOutline.scrollTop + (btnRect.top - outlineRect.top)
  const next = computeOutlineScrollTopToCenter(
    elOutline.clientHeight,
    elOutline.scrollHeight,
    contentY,
    btnRect.height
  )
  setOutlineScrollTopProgrammatic(next)
}

function onMainScroll(): void {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    outlineAutoScrollEnabled = true

    const headings = [...elArticle.querySelectorAll('h1, h2, h3, h4, h5, h6')] as HTMLElement[]
    if (headings.length === 0) return

    const mainRect = elMain.getBoundingClientRect()
    const rects = headings.map((h) => ({
      id: h.id,
      top: h.getBoundingClientRect().top,
      bottom: h.getBoundingClientRect().bottom
    }))
    const id = computeActiveHeadingId(rects, mainRect.top, READ_LINE_OFFSET)
    if (id) {
      setOutlineActive(id)
      syncOutlineScrollToActive(id)
    }
  })
}
```

**优化：** 上面 `rects` 对同一元素调用了两次 `getBoundingClientRect`，应改为一次：

```typescript
const rects = headings.map((h) => {
  const r = h.getBoundingClientRect()
  return { id: h.id, top: r.top, bottom: r.bottom }
})
```

**注册大纲 `scroll` 与用户滚动（在 `loadDocument` 之外执行一次即可，与 `elMain.addEventListener` 同级）：**

```typescript
elOutline.addEventListener(
  'scroll',
  () => {
    if (suppressOutlineScroll) return
    outlineAutoScrollEnabled = false
  },
  { passive: true }
)
```

**`buildOutline` 内按钮 `click`：** 在 `setOutlineActive(item.id)` 之后增加：

```typescript
outlineAutoScrollEnabled = true
requestAnimationFrame(() => syncOutlineScrollToActive(item.id))
```

**`loadDocument`：** 在成功渲染并 `buildOutline` 之后，于首次 `onMainScroll()` 之前设置 `outlineAutoScrollEnabled = true`（显式一行）；删除 `setupOutlineScrollSpy()` 与 `observer` 相关代码。

- [ ] **Step 1: Apply `main.ts` edits**（按上文整合变量声明顺序：门控变量须在首次使用前定义；若将 `setOutlineScrollTopProgrammatic` 等放在 `onMainScroll` 之前，避免前向引用问题。）

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: 全部 PASS。

- [ ] **Step 3: Run typecheck / build**

Run: `npm run build`

Expected: 成功完成 `electron-vite build`。

- [ ] **Step 4: Manual smoke（开发者本地）**

1. `npm run dev`，打开含多级标题的长文。
2. 滚动正文：顶栏始终在窗口上缘；大纲当前项高亮并大致垂直居中。
3. 用滚轮滚动左侧大纲列表：正文再滚时仅高亮变化、大纲不应自动跳（直至再滚正文或点击大纲）。
4. 点击大纲条目：正文跳转且恢复自动居中。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/main.ts
git commit -m "fix: unify heading sync and outline auto-scroll with user override"
```

---

### Task 4: 顶栏固定 — 防止窗口级滚动

**Files:**
- Modify: `src/renderer/src/styles.css`

- [ ] **Step 1: Add layout constraints**

在 `body {` 规则附近（或紧随 `html` 若新建）增加：

```css
html,
body {
  height: 100%;
  overflow: hidden;
}
```

若与现有 `body` 规则冲突，将 `height`/`overflow` 合并进现有 `body` 块，并新增 `html` 规则；保持 `DESIGN.md` 既有间距与字体不变。

- [ ] **Step 2: Manual verify**

重复 Task 3 Step 4 的步骤 2，确认缩小窗口高度时仍无「整页含顶栏一起滚动」。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/styles.css
git commit -m "fix: lock viewport scroll so topbar stays visible"
```

---

## Self-Review

**1. Spec coverage**

| 需求 | Task |
|------|------|
| 顶栏始终在上方 | Task 4 + Task 3 正文滚动区不变 |
| 大纲随正文高亮 + 垂直居中 | Task 1–3 |
| 用户滚大纲则关闭自动居中，直至滚正文或点击跳转 | Task 3 门控 |
| 打开新文档重置行为 | Task 3 `loadDocument` 显式 `outlineAutoScrollEnabled = true` |

**2. Placeholder scan**

无 TBD；代码块为完整片段。

**3. Type consistency**

- `computeActiveHeadingId` 与测试共用 `HeadingRect` 三字段。
- `data-anchor-id` 与 `CSS.escape(id)` 用于查询，与 `buildOutline` 一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-06-scroll-outline-sync.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
