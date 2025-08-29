import { resolve } from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 从 package.json 读取信息来填充 manifest
import packageJson from './package.json'

// 动态生成完整的 manifest
const dynamicManifest = {
  manifest_version: 3,
  name: packageJson.displayName || packageJson.name || 'Vision Compare（你的眼睛不是尺）',
  version: packageJson.version || '1.0.0',
  description: packageJson.description || '前端页面与设计稿像素级对比，提升还原率；支持覆盖、差异高亮、分屏对比、快捷键与持久化',
  permissions: [
    'activeTab',
    'storage',
    'scripting',
    'tabs',
  ],
  action: {
    default_popup: 'src/views/popup/popup.html',
    default_title: packageJson.displayName || packageJson.name || 'Vision Compare（你的眼睛不是尺）',
  },
  background: {
    service_worker: 'src/views/background/main.ts',
    type: 'module',
  },
  commands: {
    vc_toggle_panel: {
      suggested_key: { default: 'Ctrl+Shift+V' },
      description: 'Toggle Vision Compare panel',
    },
    vc_toggle_lock: {
      suggested_key: { default: 'Ctrl+Shift+L' },
      description: 'Toggle lock overlay',
    },
    vc_toggle_difference: {
      suggested_key: { default: 'Ctrl+Shift+D' },
      description: 'Toggle difference mode',
    },
    vc_exit: {
      suggested_key: { default: 'Ctrl+Shift+X' },
      description: 'Exit Vision Compare',
    },
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/views/content/main.ts'],
      run_at: 'document_end',
      all_frames: false,
    },
  ],
  icons: {
    16: 'public/icons/icon16.png',
    32: 'public/icons/icon32.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  web_accessible_resources: [
    {
      resources: ['public/icons/*.svg'],
      matches: ['<all_urls>'],
    },
  ],
}

export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest: dynamicManifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'ESNext',
    minify: false,
    rollupOptions: {
      input: {
        // 这些入口点会被 @crxjs/vite-plugin 自动处理
        background: resolve(__dirname, 'src/views/background/main.ts'),
        content: resolve(__dirname, 'src/views/content/main.ts'),
        popup: resolve(__dirname, 'src/views/popup/main.ts'),
      },
      output: {
        // 确保文件名的一致性
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
