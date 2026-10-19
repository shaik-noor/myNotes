import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend'),
      '@renderer': resolve(__dirname, 'frontend')
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild'
  },
  clearScreen: false
})
