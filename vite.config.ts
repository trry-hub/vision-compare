import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/main.ts'),
        background: resolve(__dirname, 'src/background/main.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          if (name === 'content') {
            return 'content.js'
          } else if (name === 'background') {
            return 'background.js'
          } else if (name === 'popup') {
            return 'popup.js'
          }
          return '[name].js'
        },
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.name || ''
          if (fileName.endsWith('.css')) {
            if (fileName.includes('content')) {
              return 'content.css'
            } else if (fileName.includes('popup')) {
              return 'popup.css'
            }
          }
          return '[name][extname]'
        },
        format: 'es'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2018'
  }
})
