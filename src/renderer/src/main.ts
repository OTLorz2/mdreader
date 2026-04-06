import './styles.css'
import { extractOutline } from '../../lib/extract-outline'
import { renderMarkdownToHtml } from '../../lib/render-markdown'

const elTitle = document.querySelector('#title') as HTMLSpanElement
const elOutline = document.querySelector('#outline') as HTMLElement
const elArticle = document.querySelector('#article') as HTMLElement
const elStatus = document.querySelector('#status') as HTMLElement
const elMain = document.querySelector('#main') as HTMLElement
const btnOpen = document.querySelector('#btn-open') as HTMLButtonElement
const btnRefresh = document.querySelector('#btn-refresh') as HTMLButtonElement

let currentPath: string | null = null
let scrollRaf = 0
let observer: IntersectionObserver | null = null

function showStatus(html: string, persistent = true): void {
  elStatus.innerHTML = html
  elStatus.classList.toggle('hidden', false)
  if (!persistent) {
    window.setTimeout(() => elStatus.classList.add('hidden'), 8000)
  }
}

function hideStatus(): void {
  elStatus.classList.add('hidden')
  elStatus.textContent = ''
}

function renderEmptyState(): void {
  hideStatus()
  elTitle.textContent = 'MarkdownReader'
  elTitle.removeAttribute('title')
  elOutline.innerHTML = ''
  elArticle.innerHTML = `
    <div class="empty-state">
      <p>选择本地 Markdown 文件开始阅读。</p>
      <button type="button" class="primary" id="btn-empty-open">选择 Markdown</button>
    </div>
  `
  const b = elArticle.querySelector('#btn-empty-open')
  b?.addEventListener('click', () => void pickAndOpen())
}

async function pickAndOpen(): Promise<void> {
  const p = await window.readerApi.openFileDialog()
  if (p) await loadDocument(p)
}

function setOutlineActive(id: string | null): void {
  elOutline.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', id !== null && b.dataset.anchorId === id)
  })
}

function setupOutlineScrollSpy(): void {
  observer?.disconnect()
  observer = null
  const headings = elArticle.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length === 0) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      const top = visible[0]?.target as HTMLElement | undefined
      const id = top?.id || null
      if (id) setOutlineActive(id)
    },
    { root: elMain, rootMargin: '-10% 0px -70% 0px', threshold: [0, 0.25, 0.5, 1] }
  )

  headings.forEach((h) => observer!.observe(h))
}

function onMainScroll(): void {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    const headings = [...elArticle.querySelectorAll('h1, h2, h3, h4, h5, h6')] as HTMLElement[]
    if (headings.length === 0) return
    const mainRect = elMain.getBoundingClientRect()
    let best: HTMLElement | null = null
    let bestDist = Infinity
    for (const h of headings) {
      const r = h.getBoundingClientRect()
      const dist = Math.abs(r.top - mainRect.top - 12)
      if (r.bottom > mainRect.top && dist < bestDist) {
        bestDist = dist
        best = h
      }
    }
    if (best?.id) setOutlineActive(best.id)
  })
}

function buildOutline(markdown: string): void {
  const items = extractOutline(markdown)
  elOutline.innerHTML = ''
  if (items.length === 0) {
    elOutline.innerHTML = '<p class="outline-empty">本文无 ATX 标题</p>'
    return
  }
  for (const item of items) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = item.text
    btn.dataset.anchorId = item.id
    btn.style.paddingLeft = `${(item.depth - 1) * 12 + 8}px`
    btn.addEventListener('click', () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById(item.id)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      })
      setOutlineActive(item.id)
    })
    elOutline.appendChild(btn)
  }
}

async function loadDocument(path: string): Promise<void> {
  currentPath = path
  const result = await window.readerApi.openPath(path)
  elTitle.textContent = pathBasename(path)
  elTitle.title = path

  if (!result.ok) {
    elOutline.innerHTML = ''
    elArticle.innerHTML = `<div class="error-card" role="alert">
      <strong>${escapeHtml(result.code)}</strong>
      <p>${escapeHtml(result.message)}</p>
      ${result.detail ? `<pre style="white-space:pre-wrap;font-size:12px">${escapeHtml(result.detail)}</pre>` : ''}
    </div>`
    hideStatus()
    return
  }

  if (result.markdown.length === 0) {
    elOutline.innerHTML = '<p class="outline-empty">本文无 ATX 标题</p>'
    elArticle.innerHTML = '<p class="empty-state">这份文档是空的</p>'
    hideStatus()
    return
  }

  const baseDir = path.replace(/[/\\][^/\\]+$/, '') || null
  const html = await renderMarkdownToHtml(result.markdown, { baseDir })
  elArticle.innerHTML = html
  buildOutline(result.markdown)

  const warnings: string[] = []
  if (result.warnLargeFile) warnings.push('文件较大，滚动或编辑可能卡顿。')
  if (result.warnLargeChars) warnings.push('字符数较多，渲染可能较慢。')
  if (warnings.length) showStatus(warnings.join(' '))
  else hideStatus()

  elMain.removeEventListener('scroll', onMainScroll)
  elMain.addEventListener('scroll', onMainScroll, { passive: true })
  setupOutlineScrollSpy()
  onMainScroll()
}

function pathBasename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

elArticle.addEventListener('click', (e) => {
  const t = e.target as HTMLElement | null
  const a = t?.closest('a') as HTMLAnchorElement | null
  if (!a || !elArticle.contains(a)) return
  const href = a.getAttribute('href') || ''
  if (!href || href.startsWith('#')) return
  e.preventDefault()
  try {
    const u = new URL(href, 'https://local.invalid')
    if (u.protocol === 'https:') {
      void window.readerApi.openExternal(href)
      return
    }
    const msg = `已阻止打开 ${href} (ERR_LINK_POLICY)`
    showStatus(
      `${escapeHtml(msg)} <button type="button" id="copy-link">复制链接</button>`,
      false
    )
    document.querySelector('#copy-link')?.addEventListener('click', () => {
      void navigator.clipboard.writeText(href)
    })
  } catch {
    showStatus(`已阻止打开 ${escapeHtml(href)} (ERR_LINK_POLICY)`, false)
  }
})

btnOpen.addEventListener('click', () => void pickAndOpen())
btnRefresh.addEventListener('click', () => {
  if (currentPath) void loadDocument(currentPath)
})

window.readerApi.onFileOpenRequested((path) => void loadDocument(path))

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    void pickAndOpen()
  }
  if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
    e.preventDefault()
    if (currentPath) void loadDocument(currentPath)
  }
})

renderEmptyState()
