import { motion } from 'framer-motion'
import { ArrowUpRightFromSquare, PanelRightClose } from 'lucide-react'
import type React from 'react'
import type { Note } from '../../../types/notes'
import { Button } from '../../ui/button'
import { MarkdownRenderer } from '../../ui/MarkdownRenderer'
import { duration, ease, prefersReducedMotion } from '../../ui/motion'
import { PanelResizeHandle } from '../../ui/PanelResizeHandle'
import { useResizablePanel } from '../../ui/useResizablePanel'
import { NoteGlyph } from '../noteIcon'

interface NotePeekPanelProps {
  noteId: string
  notes: Note[]
  onClose: () => void
  onOpenFull: (id: string) => void
  onPeek: (id: string) => void
}

/**
 * A right-side, read-only page peek panel.
 */
export const NotePeekPanel: React.FC<NotePeekPanelProps> = ({
  noteId,
  notes,
  onClose,
  onOpenFull,
  onPeek
}) => {
  const note = notes.find((n) => n.id === noteId) || null
  const reduced = prefersReducedMotion()

  const { width, isDragging, onHandleMouseDown } = useResizablePanel({
    initial: 460,
    min: 360,
    max: 760,
    storageKey: 'mynotes:page-peek-width',
    edge: 'left'
  })

  if (!note) {
    return (
      <motion.aside
        initial={{ x: reduced ? 0 : 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: reduced ? 0 : 40, opacity: 0 }}
        transition={{ duration: reduced ? 0 : duration.base, ease: ease.out }}
        style={{ width }}
        className="relative flex h-full shrink-0 flex-col border-l border-border/60 bg-card"
      >
        <div
          data-slot="note-peek-header"
          className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-3"
        >
          <span className="text-xs text-muted-foreground">This page no longer exists.</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="cursor-pointer"
            aria-label="Close"
          >
            <PanelRightClose className="size-4" />
          </Button>
        </div>
      </motion.aside>
    )
  }

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const target = (e.target as HTMLElement).closest('a')
    if (target) {
      const href = target.getAttribute('href')
      if (href?.startsWith('mynotes:') || href?.startsWith('mydesk-note:')) {
        e.preventDefault()
        const targetId = href.startsWith('mynotes:')
          ? href.replace('mynotes:', '')
          : href.replace('mydesk-note:', '')
        if (notes.find((n) => n.id === targetId)) {
          onPeek(targetId)
        }
      }
    }
  }

  return (
    <motion.aside
      initial={{ x: reduced ? 0 : 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: reduced ? 0 : 40, opacity: 0 }}
      transition={{ duration: reduced ? 0 : duration.base, ease: ease.out }}
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-l border-border/60 bg-card"
    >
      <PanelResizeHandle onMouseDown={onHandleMouseDown} isDragging={isDragging} />

      <div
        data-slot="note-peek-header"
        className="flex h-11 shrink-0 items-center gap-2 border-b border-border/60 px-3"
      >
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-notes/10 text-notes">
          <NoteGlyph icon={note.icon} active className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-semibold text-foreground">
            {note.title || 'Untitled Note'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onOpenFull(note.id)}
          className="cursor-pointer"
          title="Open as full page"
          aria-label="Open as full page"
        >
          <ArrowUpRightFromSquare className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <PanelRightClose className="size-4" />
        </Button>
      </div>

      <div onClick={handleBodyClick} className="flex-1 overflow-y-auto px-6 py-5">
        {note.title && <h1 className="mb-4 text-lg font-bold text-foreground">{note.title}</h1>}
        <MarkdownRenderer content={note.content} />
      </div>
    </motion.aside>
  )
}
