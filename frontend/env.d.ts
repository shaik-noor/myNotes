/// <reference types="vite/client" />

import type { tauriApi } from './tauriBridge'

declare global {
  interface Window {
    api: typeof tauriApi
  }
}

export {}
