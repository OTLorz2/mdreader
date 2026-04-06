# MarkdownReader（playground7）

Windows 上可安装或便携运行的 Electron Markdown 阅读器：双击或命令行打开 `.md`，GFM 子集安全渲染、左侧 ATX 大纲与锚点跳转、浅色纸张感布局。

## 为何选用 Electron（3–5 句）

团队在两周试用期内需要快速验证「文件关联 + 本地读文件 + 前端栈复用」这条路径；Electron 与现有 TypeScript / Vite 工具链一致，且 **electron-builder** 对 Windows 安装包、`fileAssociations` 有成熟模板，便于与 IT 分发流程对齐。主进程可安全使用 `fs`、编码探测与体积阈值，渲染进程保持沙箱与 `contextBridge` 窄 IPC。若未来要显著减小安装体积与安全面，可在 v2 评估 **Tauri** 等方案，本仓库 README 与业务边界仍以当前 MVP 为准。

## 主题与显示

默认使用**浅色阅读主题**（纸张感背景与正文栏），**不跟随**系统深色模式，以保证长文阅读对比稳定。

## Windows 文件关联

安装包（NSIS）可将 `.md` 关联到本应用。若需**回滚**关联：Windows **设置 → 应用 → 默认应用 → 按文件类型选择默认值**，找到 `.md` 改回记事本或其它编辑器即可。

## 体积与字符上限

- `MAX_FILE_BYTES`：**524288**（512 KiB）。超过仍会打开，但会提示可能卡顿。
- `MAX_MARKDOWN_CHARS`：**50000**。超过会提示渲染可能较慢。

## 已知限制

- 重复标题的文档内锚点为 **GitHub 式 slug**；跳转时与浏览器一致，取**第一个**匹配 `id` 的元素。
- 大纲仅包含 **ATX 风格** `#` 标题，**不含 Setext** 下划线标题。
- **数学公式、Mermaid** 等不在 v1 范围。

## 开发与打包

```bash
npm install
npm run dev
npm test
npm run dist
```

打包产物在 `release/`（`.exe` 安装包与 `.zip` 便携目录）。

若企业网络无法访问 GitHub，`electron-builder` 在首次构建时可能需下载 NSIS 等工具；已在 `package.json` 的 `build.win` 中设置 `signAndEditExecutable: false`，避免额外拉取 `winCodeSign`（仍会写入可执行元数据，**不替代**正式代码签名流程）。图标使用 `build/icon.png`（electron-builder 会用于打包）。

主进程构建为 **CommonJS**（`out/main/index.cjs`），避免 Vite/Rollup 生成 ESM 主进程时对 Node 内置 `buffer`/`fs` 的 default import 在 Electron 下触发 `cjsPreparseModuleExports` 崩溃。

### 启动失败 / 窗口一闪而过

- **环境变量 `ELECTRON_RUN_AS_NODE=1`**：在此模式下 `require('electron')` 会变成路径字符串，主进程 API 不可用。`npm run dev` / `npm run preview` 通过 `scripts/run-electron-vite.mjs` 在**子进程环境对象中删除**该变量（比 Windows 上 `cross-env VAR=` 更可靠）。若你直接在终端执行 `electron-vite dev` 或从 IDE 配置启动，请自行去掉全局/用户级的 `ELECTRON_RUN_AS_NODE`，或在 PowerShell 中先执行：`Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue`。

## 错误码（英文）

| 码 | 含义 |
|----|------|
| `NOT_FOUND` | 文件不存在 |
| `EACCES` | 无权限读取 |
| `BINARY_LIKELY` | 内容疑似二进制 |
| `ENCODING_UNKNOWN` | UTF-8 严格解码失败且无法猜测编码 |
| `UNKNOWN` | 其它读盘错误 |
| `ERR_LINK_POLICY` | 非 `https:` 外链被拦截 |
| `ERR_READ` | 读文件失败（通用） |

## 试用记录（模板）

三人每周 ≥3 次可用手动记录：

| 日期 | 使用次数 | 省时/体验一句话 |
|------|----------|------------------|
| | | |
