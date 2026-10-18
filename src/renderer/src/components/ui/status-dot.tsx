import type React from 'react'
import { cn } from './utils'

interface StatusDotProps {
  status?: 'saved' | 'saving' | 'error'
  tone?: 'running' | 'done' | 'neutral' | 'error'
  pulse?: boolean
  label?: string
  className?: string
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, tone, pulse, label, className }) => {
  const isSaving = status === 'saving' || tone === 'running' || pulse
  const isError = status === 'error' || tone === 'error'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-block size-2 rounded-full transition-all duration-300',
          !isSaving && !isError && 'bg-notes',
          isSaving && 'bg-amber-500 animate-pulse',
          isError && 'bg-destructive'
        )}
        title={label || (isSaving ? 'Saving…' : isError ? 'Error' : 'Saved')}
      />
      {label && <span className="text-2xs font-medium text-muted-foreground">{label}</span>}
    </span>
  )
}
