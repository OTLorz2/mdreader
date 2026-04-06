import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    /** chardet / iconv-lite 以外部裸 import 时在 Electron ESM 下会触发 CJS 互操作崩溃，须打入 bundle */
    plugins: [externalizeDepsPlugin({ exclude: ['chardet', 'iconv-lite'] })],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
        /** ESM 主进程 + Rollup 对 buffer/fs 的 default import 在 Electron 33 下会报 cjsPreparseModuleExports */
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs'
        }
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
