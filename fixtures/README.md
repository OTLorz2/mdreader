# Fixtures

本目录用于放置三份**脱敏**样本（由 Assignment 提供），建议命名：

- `sample-basic.md` — 代码块、表格、任务列表
- `sample-media.md` — 相对路径图片、锚点跳转
- `sample-long.md` — 长文滚动、重复标题 slug

## 手动验收 checklist

| 项 | 说明 |
|----|------|
| 代码块 |  fenced 代码高亮/等宽显示正常 |
| 表格 | GFM 表格渲染 |
| 任务列表 | checkbox 列表 |
| 相对图片 | `baseDir` 下图片以 `file://` 打开 |
| 锚点 | 大纲跳转与正文 `id` 一致 |
| 重复标题 | 第二个标题 slug 带 `-1` 后缀 |
| 长文滚动 | 大文件滚动与大纲 active 状态 |

仓库内暂含 `sample.md` 供本地冒烟。
