import { AlertTriangle } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Button } from './button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog'

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
      return Promise.resolve(false)
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
    <Dialog
      open={!!dialogState}
      onOpenChange={(open) => {
        if (!open) handleClose(false)
      }}
    >
      {dialogState && (
        <DialogContent
          className="max-w-md"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById('confirm-cancel')?.focus()
          }}
        >
          <div className="flex items-start gap-4">
            {dialogState.destructive && (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle>{dialogState.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {dialogState.description || 'Choose an option to continue.'}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2.5">
            <Button
              id="confirm-cancel"
              variant="outline"
              size="sm"
              onClick={() => handleClose(false)}
            >
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
        </DialogContent>
      )}
    </Dialog>
  )
}
