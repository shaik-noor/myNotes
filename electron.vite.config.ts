import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig(() => {
  return {
    main: {
      plugins: [externalizeDepsPlugin()]
    },
    preload: {
      plugins: [externalizeDepsPlugin()]
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve(__dirname, 'src/renderer/src'),
          '@': resolve(__dirname, 'src/renderer/src')
        }
      },
      plugins: [react(), tailwindcss()],
      build: {
        minify: 'esbuild' as const
      }
    }
  }
})

