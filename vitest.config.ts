import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'frontend'),
      '@': resolve(__dirname, 'frontend')
    }
  }
})
