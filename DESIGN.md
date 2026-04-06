# Design System — MarkdownReader

## Product Context

- **What this is:** Windows 上可安装或便携运行的 Electron Markdown 阅读器：读优先、GFM 安全渲染、左侧 ATX 大纲与锚点跳转，浅色纸张感默认布局。
- **Who it's for:** 团队内部试用与文档阅读场景；需要稳定对比与可预期的 Windows 文件关联行为。
- **Space/industry:** 本地阅读器 / 生产力工具；相邻参照含各类编辑器阅读模式、文档站与 Runbook 阅读流（对标仅作 baseline，不复制具体界面）。
- **Project type:** 桌面应用内的阅读型 Web UI（顶栏 + 侧栏大纲 + 正文阅读柱）。

## Aesthetic Direction

- **Direction:** 编辑/长文（Editorial）气质的阅读柱 + 克制实用的工具区（Industrial/Utilitarian 轻量化），整体避免营销化与「模板感」装饰。
- **Decoration level:** intentional — 以纸张暖底与清晰边框为主；若增加质感，仅使用极低对比的纸质微纹/噪点，不得干扰正文层级。
- **Mood:** 安静、可信、适合长时间阅读；界面信息结构优先于视觉表演。
- **Reference sites:** 无强制外部站引用；品类内共性为「限制行长、清晰标题层级、可读链接与代码样式」。

## Typography

- **Display/Hero:** Source Serif 4 — 与长文 Markdown 内容一致，屏幕可读性优于传统印刷向衬线。
- **Body:** Source Serif 4 — 与 Display 同一族，保证标题与正文语汇统一。
- **UI/Labels:** DM Sans — 大纲、顶栏、按钮、表单标签；与衬线正文对比清晰，避免混用 Inter/Roboto 作为默认主字体。
- **Data/Tables:** JetBrains Mono，`font-variant-numeric: tabular-nums` — 错误码、表格、对齐数据。
- **Code:** JetBrains Mono — 行内代码与代码块。
- **Loading:** Google Fonts 开发预览可接受；生产环境建议自托管 subset 或企业内 CDN，并配置 `font-display: swap`。
- **Scale:** 建议模块化比例（示例）：UI 12–14px、大纲 13px、正文 17–18px（约 1.0625rem）、文章标题 h1 级 2–2.75rem（视口 clamp）、段行高 1.65–1.75。

## Color

- **Approach:** restrained — 颜色少而语义明确；强调色主要用于链接、焦点环、主按钮，不做大面积渐变背景。
- **Primary:** `#1b4965`（Ink）— 链接、主操作、大纲当前项强调；深色模式下可提高亮度并略降饱和（见下）。
- **Secondary:** 不作为第二品牌色堆叠；用中性阶与边框承担层级。
- **Neutrals:** 暖灰纸感 — 背景 `#f6f3ee`、表面 `#fffef9`、正文 `#1a1a1a`、次要文字 `#5c5c5c`、边框 `#e0dcd4`（可按实现微调但保持暖调一致）。
- **Semantic:** success 文本约 `#1e4a2e`、warning 约 `#7a4e00`、error 约 `#7f1d1d`、info 与主色系一致；背景/边框为对应浅色表面（见预览页 token）。
- **Dark mode:** 产品默认可不跟随系统（以 README 策略为准）；若提供应用内深色，应重映射表面与正文对比，主色建议改为偏亮、降饱和的蓝青（如 `#6ea8c9` 一类），并重新校验 WCAG 对比。

## Spacing

- **Base unit:** 8px。
- **Density:** 阅读区 comfortable；大纲与顶栏可略紧凑。
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) — 与代码中 `--space-*` 命名对齐时可保留并逐步补全缺失台阶。

## Layout

- **Approach:** grid-disciplined — 可预测对齐；阅读柱单独限制最大宽度（约 65–72ch 或 42rem 量级）。
- **Grid:** 顶栏通栏；下方主区为「可调整宽度的左侧大纲 + 右侧滚动阅读区」；小宽度下可折行或隐藏大纲的策略由实现阶段决定。
- **Max content width:** 阅读正文约 42rem（约 672px）或按 ch 限制，以扫行舒适为准。
- **Border radius:** 分级 — sm 4px、md 6px、lg 10px； pill/圆形仅用于极少数控件（如头像占位）。

## Motion

- **Approach:** minimal-functional — 仅服务于理解与状态反馈，不做叙事性滚动动画。
- **Easing:** 进入 ease-out、退出 ease-in、位移 ease-in-out。
- **Duration:** micro 50–100ms、short 150–250ms、medium 250–400ms、long 400–700ms（长动画慎用）。

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-06 | Initial design system created | /design-consultation：基于 README 与现有 `styles.css`，用户选择不开展外部竞品调研；强调色从通用蓝改为墨水蓝以区分默认 Web 模板感 |
| 2026-04-06 | 预览页含浅色/深色切换 | 便于验收 token；应用层是否提供深色主题与是否跟随系统由产品策略独立决定 |
