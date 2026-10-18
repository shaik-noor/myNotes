import { ChevronRight } from 'lucide-react'
import type React from 'react'
import { NoteGlyph } from '../noteIcon'

interface BreadcrumbsProps {
  ancestors: Array<{ id: string; title: string; icon?: string | null }>
  currentTitle: string
  currentIcon?: string | null
  onNavigate: (id: string) => void
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  ancestors,
  currentTitle,
  currentIcon,
  onNavigate
}) => {
  if (ancestors.length === 0) return null

  return (
    <nav
      aria-label="Page location"
      className="mb-2 flex items-center gap-0.5 overflow-x-auto text-xs text-muted-foreground select-none"
    >
      {ancestors.map((ancestor) => (
        <div key={ancestor.id} className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onNavigate(ancestor.id)}
            title={ancestor.title || 'Untitled'}
            className="flex max-w-48 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <NoteGlyph icon={ancestor.icon} isBook className="size-3.5" />
            <span className="truncate font-medium">{ancestor.title || 'Untitled'}</span>
          </button>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
        </div>
      ))}
      <span
        aria-current="page"
        title={currentTitle || 'Untitled'}
        className="flex max-w-56 shrink-0 items-center gap-1.5 px-1.5 py-0.5 font-medium text-foreground/80"
      >
        <NoteGlyph icon={currentIcon} className="size-3.5" />
        <span className="truncate">{currentTitle || 'Untitled'}</span>
      </span>
    </nav>
  )
}

