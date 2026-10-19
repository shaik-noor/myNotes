import { motion } from 'framer-motion'
import type React from 'react'
import { duration, ease, prefersReducedMotion } from './motion'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false
}) => {
  const reduced = prefersReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : duration.base, ease: ease.out }}
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'gap-2 px-3 py-6' : 'gap-3 px-6 py-12'
      } ${className ?? ''}`}
    >
      <div
        className={`flex items-center justify-center rounded-xl bg-muted/60 text-muted-foreground/70 ${
          compact ? 'size-9' : 'size-12'
        }`}
      >
        <Icon className={compact ? 'size-4.5' : 'size-6'} />
      </div>
      <div className="flex flex-col gap-1">
        <p className={`font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
        {description && (
          <p
            className={`mx-auto max-w-[220px] text-muted-foreground ${
              compact ? 'text-2xs leading-snug' : 'text-xs leading-relaxed'
            }`}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className={compact ? 'mt-0.5' : 'mt-1'}>{action}</div>}
    </motion.div>
  )
}
