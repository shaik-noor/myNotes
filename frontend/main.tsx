import './tauriBridge'
import React from 'react'
import { MotionConfig } from 'framer-motion'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ThemeProvider } from './context/ThemeContext'
import './assets/main.css'

async function startApp(): Promise<void> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('preview')) {
    await import('./tests/fixtures/browserPreview')
  }
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ErrorBoundary>
      </MotionConfig>
    </React.StrictMode>
  )
}
void startApp()
