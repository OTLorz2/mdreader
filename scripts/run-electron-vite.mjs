/**
 * 从子进程环境中移除 ELECTRON_RUN_AS_NODE，再启动 electron-vite。
 * Windows 上 cross-env VAR= 往往仍会把变量设成空字符串，而部分工具链会继承
 * 用户/IDE 全局设置的 ELECTRON_RUN_AS_NODE=1，导致 Electron 以 Node 模式启动、
 * require('electron') 变成路径字符串，主进程 API 不可用。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const mode = process.argv[2] || 'dev'
if (mode !== 'dev' && mode !== 'preview') {
  console.error('Usage: node scripts/run-electron-vite.mjs <dev|preview>')
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const cli = path.join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')
const child = spawn(process.execPath, [cli, mode], {
  cwd: root,
  env,
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
