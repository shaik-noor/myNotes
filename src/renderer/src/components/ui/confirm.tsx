import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Button } from './button'

interface ConfirmDialogOptions {
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

let activeConfirm: ((opts: ConfirmDialogOptions) => Promise<boolean>) | null = null

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  if (!activeConfirm) return Promise.resolve(false)
  return activeConfirm(options)
}

export const ConfirmProvider: React.FC = () => {
  const [dialogState, setDialogState] = useState<ConfirmState | null>(null)

  useEffect(() => {
    activeConfirm = (opts: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        setDialogState({
          ...opts,
          id: Math.random().toString(36).slice(2),
          resolve
        })
      })

    return () => {
      activeConfirm = null
    }
  }, [])

  const handleClose = (result: boolean): void => {
    if (dialogState) {
      dialogState.resolve(result)
      setDialogState(null)
    }
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
