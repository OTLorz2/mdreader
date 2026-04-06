# TODOS

## Markdown Reader MVP

### 启动门禁结论（签名 / MSI / 便携版）

**What:** 在 M0 当日结束前明确：是否允许未签名 `.exe`、企业证书或 MSI 要求、内部分发渠道；若不成立则选定便携版 / Zip 绿色版路线。

**Why:** 两周试用依赖同事能装上并打开 `.md`；门禁未决则 M2（关联与分发）整体顺延，无法启动可核验试用。

**Context:** 设计文档「启动门禁」要求关闭时点不晚于 M0 结束。需与 IT/安全对齐外链与 `file://` 策略。结论应写入 README 或 ADR 片段，便于试用前自检。从「门禁清单」模板开始勾选项即可。

**Effort:** M  
**Priority:** P0  
**Depends on:** None  

---

### 三份脱敏样本与绑定 checklist

**What:** 收集短/中/长各一份真实使用场景的脱敏 `.md`，并为每份列出必须正确的元素（代码块、表格、相对图片、锚点标题等）形成 checklist。

**Why:** 没有固定样本则 GFM 子集验收会与开发并行漂移；设计规定 checklist 定稿不得晚于 M1 结束。

**Context:** 与设计「The Assignment」「Success Criteria」一致。样本应放入仓库 `fixtures/` 或约定目录，checklist 可放在 `docs/` 或与测试用例同名注释。长样本用于定义「长样本」性能与滚动验收基准。

**Effort:** M  
**Priority:** P0  
**Depends on:** None  

---

### README：Electron 选型说明（ADR 风格一段话）

**What:** 在 README 或 `docs/adr-001-electron.md` 中用约一段话写明 MVP 选用 Electron 的原因（分发、团队栈、两周工期），并指向设计文档或里程碑。

**Why:** 设计书面产出要求；方便未来同事或 v2 技术债讨论时快速对齐决策背景。

**Context:** 内容可与设计「Recommended Approach」一致，避免重复发明理由。在首次公开仓库或内部分享前完成即可。

**Effort:** S  
**Priority:** P1  
**Depends on:** 应用仓库骨架已存在（可与 M0 并行起草）  

---

### 「长样本」量化与滚动 / 大纲跳转验收记录

**What:** 以 Assignment 中最长脱敏样本的大小与字符数为基准；若超过设计阈值（如 >512KB 或 >50k 字符）须在成功标准中勾选「已用该文件做过滚动与大纲跳转验收」，否则下调 UI/文档中的字符上限并注明。

**Why:** 性能 v1 底线与「是否做虚拟滚动 / 仅警告」二选一成文；避免试用末期才发现大卡死。

**Context:** 依赖脱敏长样本就绪（见上条）。验收结果可记在 checklist 或 QA 记录中，并在 README 注明上限或「无上限但可能卡顿」策略。

**Effort:** S  
**Priority:** P1  
**Depends on:** 三份脱敏样本与绑定 checklist  

---

### v1.1：在 IDE 中打开 / 复制路径

**What:** 评估并实现「在默认 IDE 中打开当前文件」或「复制文件路径到剪贴板」等跳转，降低阅读器与 IDE 工作流摩擦。

**Why:** 设计 Open Questions 之一；MVP 不挡发布，但收集试用反馈后可能变成高频诉求。

**Context:** 需在 Windows 上确定 IDE 探测策略（环境变量、注册表、`code` CLI 等）与权限。建议在 MVP 试用后再开 issue 细化。

**Effort:** M  
**Priority:** P3  
**Depends on:** Markdown Reader MVP 核心路径（M0–M2）已可用  

---

## Completed

<!-- 完成后将对应条目移至此处并追加：**Completed:** vX.Y.Z (YYYY-MM-DD) -->
