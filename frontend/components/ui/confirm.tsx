import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Button } from './button'

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

interface ConfirmState extends ConfirmDialogOptions {
  id: string
  resolve: (value: boolean) => void
}

type ConfirmListener = (state: ConfirmState | null) => void

class ConfirmManager {
  private listener: ConfirmListener | null = null
  private currentResolver: ((val: boolean) => void) | null = null

  subscribe(listener: ConfirmListener): () => void {
    this.listener = listener
    return () => {
      if (this.listener === listener) {
        this.listener = null
      }
    }
  }

  ask(options: ConfirmDialogOptions): Promise<boolean> {
    if (!this.listener) {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const ok = window.confirm(`${options.title}\n\n${options.description || ''}`)
        return Promise.resolve(ok)
      }
      return Promise.resolve(true)
    }

    if (this.currentResolver) {
      this.currentResolver(false)
      this.currentResolver = null
    }

    return new Promise<boolean>((resolve) => {
      this.currentResolver = resolve
      this.listener?.({
        ...options,
        id: Math.random().toString(36).slice(2),
        resolve: (val: boolean) => {
          this.currentResolver = null
          resolve(val)
        }
      })
    })
  }

  close(result: boolean): void {
    if (this.currentResolver) {
      const resolver = this.currentResolver
      this.currentResolver = null
      this.listener?.(null)
      // Resolve asynchronously so the dialog closes and DOM events finish
      // cleanly before any caller state changes trigger React re-renders
      setTimeout(() => {
        resolver(result)
      }, 0)
    } else {
      this.listener?.(null)
    }
  }
}

export const confirmManager = new ConfirmManager()

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return confirmManager.ask(options)
}

export function ConfirmDialog(): React.JSX.Element {
  const [dialogState, setDialogState] = useState<ConfirmState | null>(null)

  useEffect(() => {
    return confirmManager.subscribe(setDialogState)
  }, [])

  const handleClose = (result: boolean): void => {
    confirmManager.close(result)
  }

  return (
    <AnimatePresence>
      {dialogState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleClose(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-card-foreground select-none"
          >
            <div className="flex items-start gap-4">
              {dialogState.destructive ? (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" />
                </div>
              ) : null}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground leading-tight">
                  {dialogState.title}
                </h3>
                {dialogState.description && (
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {dialogState.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                {dialogState.cancelText || 'Cancel'}
              </Button>
              <Button
                variant={dialogState.destructive ? 'destructive' : 'default'}
                size="sm"
                onClick={() => handleClose(true)}
              >
                {dialogState.confirmText || 'Confirm'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Export both ConfirmDialog and ConfirmProvider for complete backwards compatibility
export function ConfirmProvider(): React.JSX.Element {
  return <ConfirmDialog />
}
