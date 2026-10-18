import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  description?: string
}

type ToastListener = (toasts: ToastMessage[]) => void

class ToastStore {
  private toasts: ToastMessage[] = []
  private listeners: Set<ToastListener> = new Set()

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener)
    listener(this.toasts)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const l of this.listeners) l(this.toasts)
  }

  add(type: 'success' | 'error' | 'info', message: string, options?: { description?: string }): void {
    const id = Math.random().toString(36).slice(2)
    const toast: ToastMessage = { id, type, message, description: options?.description }
    this.toasts = [...this.toasts, toast]
    this.notify()

    setTimeout(() => {
      this.remove(id)
    }, 4000)
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.notify()
  }
}

const store = new ToastStore()

export const toast = {
  success: (msg: string, opts?: { description?: string }) => store.add('success', msg, opts),
  error: (msg: string, opts?: { description?: string }) => store.add('error', msg, opts),
  info: (msg: string, opts?: { description?: string }) => store.add('info', msg, opts)
}

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    return store.subscribe(setToasts)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-xl text-popover-foreground"
          >
            {t.type === 'success' && <CheckCircle className="size-4 shrink-0 text-notes mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />}
            {t.type === 'info' && <Info className="size-4 shrink-0 text-notes mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{t.message}</p>
              {t.description && (
                <p className="mt-1 text-2xs text-muted-foreground leading-normal break-words">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => store.remove(t.id)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
