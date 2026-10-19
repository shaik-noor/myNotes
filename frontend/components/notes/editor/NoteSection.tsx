import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type React from 'react'
import { duration, ease, prefersReducedMotion } from '../../ui/motion'
import { cn } from '../../ui/utils'

interface NoteSectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function NoteSection({
  icon: Icon,
  label,
  count,
  open,
  onOpenChange,
  action,
  className,
  children
}: NoteSectionProps): React.JSX.Element {
  const collapsible = open !== undefined && !!onOpenChange
  const isOpen = collapsible ? open : true
  const reduce = prefersReducedMotion()

  const heading = (
    <>
      {collapsible && (
        <ChevronRight
          className={cn(
            'size-3.5 text-muted-foreground/60 transition-transform duration-150 group-hover/section:text-foreground',
            isOpen && 'rotate-90'
          )}
        />
      )}
      <span className="flex size-6 items-center justify-center rounded-md border border-notes/20 bg-notes/10 text-notes">
        <Icon className="size-3.5" />
      </span>
      <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover/section:text-foreground">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-muted/70 px-1.5 text-2xs font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </>
  )

  return (
    <section className={cn('mt-10 border-t border-border/40 pt-5 select-none', className)}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => onOpenChange?.(!isOpen)}
            aria-expanded={isOpen}
            className="group/section -ml-1 flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5"
          >
            {heading}
          </button>
        ) : (
          <div className="group/section flex items-center gap-2">{heading}</div>
        )}
        {action}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{
              duration: reduce ? 0 : duration.base,
              ease: ease.out as [number, number, number, number]
            }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
