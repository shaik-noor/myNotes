import { Check, Loader2, RefreshCw, Sparkles, Square, X } from 'lucide-react'
import type React from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { AiInlineState } from './useAiInline'

interface AiInlineToolbarProps {
  state: AiInlineState
  onAccept: () => void
  onReject: () => void
  onRegenerate: () => void
  onStop: () => void
}

export const AiInlineToolbar: React.FC<AiInlineToolbarProps> = ({
  state,
  onAccept,
  onReject,
  onRegenerate,
  onStop
}) => {
  const { phase, actionLabel, anchor } = state
  const active = phase === 'streaming' || phase === 'ready'

  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onReject()
      } else if (phase === 'ready' && (e.key === 'Enter' || e.key === 'Tab')) {
        e.preventDefault()
        onAccept()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active, phase, onAccept, onReject])

  if (!active || !anchor) return null

  const left = Math.min(Math.max(anchor.x, 12), window.innerWidth - 340)
  const top = Math.min(anchor.y + 8, window.innerHeight - 52)

  return createPortal(
    <div
      className="fixed z-50 flex items-center gap-1.5 rounded-2xl border border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md duration-100 animate-in fade-in zoom-in-95 text-popover-foreground"
      style={{ left, top }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {phase === 'streaming' ? (
        <>
          <span className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-notes" />
            {actionLabel || 'Generating'}…
          </span>
          <button
            type="button"
            onClick={onStop}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            title="Stop generating"
          >
            <Square className="size-3" />
            Stop
          </button>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5 px-2 text-xs font-medium text-notes">
            <Sparkles className="size-3.5" />
            {actionLabel}
          </span>
          <div className="mx-0.5 h-4 w-px bg-border/60" />
          <button
            type="button"
            onClick={onAccept}
            className="flex h-7 items-center gap-1 rounded-md bg-notes px-2.5 text-xs font-medium text-notes-foreground transition-colors hover:bg-notes/90 cursor-pointer"
            title="Accept (Enter)"
          >
            <Check className="size-3.5" />
            Accept
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            title="Reject (Esc)"
          >
            <X className="size-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            title="Regenerate"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
