import { BookOpen, FileText } from 'lucide-react'
import type React from 'react'
import { cn } from '../ui/utils'

export function isEmojiIcon(icon: string | null | undefined): icon is string {
  if (!icon) return false
  const t = icon.trim()
  if (!t) return false
  try {
    return /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\u200D(\p{Emoji_Presentation}|\p{Extended_Pictographic})|\uFE0F|\p{Emoji_Modifier})*$/u.test(
      t
    )
  } catch {
    return t.length <= 4 && !/^[ -~]*$/.test(t)
  }
}

export function NoteGlyph({
  icon,
  isBook,
  active,
  className
}: {
  icon?: string | null
  isBook?: boolean
  active?: boolean
  className?: string
}): React.JSX.Element {
  if (isEmojiIcon(icon)) {
    return (
      <span
        className={cn('inline-flex size-4 shrink-0 items-center justify-center text-sm', className)}
      >
        {icon}
      </span>
    )
  }
  const Icon = isBook ? BookOpen : FileText
  return (
    <Icon
      className={cn(
        'size-4 shrink-0 transition-colors',
        active || isBook ? 'text-notes' : 'text-muted-foreground/70',
        className
      )}
    />
  )
}
