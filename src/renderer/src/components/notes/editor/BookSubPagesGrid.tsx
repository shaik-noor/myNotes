import { BookOpen, Library, Plus } from 'lucide-react'
import type React from 'react'
import { Button } from '../../ui/button'
import type { Note } from '../../../types/notes'
import { NoteGlyph } from '../noteIcon'
import { NoteSection } from './NoteSection'

interface BookSubPagesGridProps {
  bookTitle: string
  bookId: string
  childNotes: Note[]
  onSelectNote: (id: string) => void
  onCreateChild: (parentId: string) => void
}

function getContentPreview(content: string): string {
  if (!content) return ''
  const text = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~`#>-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

function getWordCount(content: string): number {
  if (!content) return 0
  const clean = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`_~]/g, ' ')
    .trim()
  if (!clean) return 0
  return clean.split(/\s+/).filter(Boolean).length
}

export const BookSubPagesGrid: React.FC<BookSubPagesGridProps> = ({
  bookTitle,
  bookId,
  childNotes,
  onSelectNote,
  onCreateChild
}) => {
  return (
    <NoteSection
      icon={Library}
      label="Pages in this book"
      count={childNotes.length}
      action={
        childNotes.length > 0 && (
          <Button
            onClick={() => onCreateChild(bookId)}
            size="sm"
            variant="outline"
            className="h-7 cursor-pointer gap-1.5 rounded-lg border-border/60 text-xs shadow-2xs"
            title={`Add a new page to "${bookTitle}"`}
          >
            <Plus className="size-3.5 text-notes" />
            Add page
          </Button>
        )
      }
    >
      {childNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-8 text-center">
          <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-notes/20 bg-notes/10 text-notes">
            <BookOpen className="size-5" />
          </span>
          <p className="mb-1 text-xs font-semibold text-foreground">This book is empty</p>
          <p className="mb-4 max-w-xs text-2xs text-muted-foreground">
            Add pages to organize chapters, topics, or notes inside “{bookTitle || 'this book'}”.
          </p>
          <Button
            onClick={() => onCreateChild(bookId)}
            size="sm"
            className="h-8 cursor-pointer gap-1.5 rounded-lg bg-notes text-xs text-notes-foreground hover:bg-notes/90"
          >
            <Plus className="size-3.5" />
            Create first page
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {childNotes.map((page) => {
            const words = getWordCount(page.content)
            const preview = getContentPreview(page.content)

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onSelectNote(page.id)}
                className="group flex cursor-pointer flex-col justify-between rounded-xl border border-border/50 bg-card/40 p-3.5 text-left shadow-2xs transition-[background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-notes/40 hover:bg-card/70 hover:shadow-md focus-visible:ring-2 focus-visible:ring-notes/50 focus-visible:outline-none"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <NoteGlyph icon={page.icon} className="size-4 group-hover:text-notes" />
                    <span className="truncate text-xs font-semibold text-foreground/90 group-hover:text-foreground">
                      {page.title || 'Untitled'}
                    </span>
                  </div>
                  {preview ? (
                    <p className="mt-2 text-2xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                      {preview}
                    </p>
                  ) : (
                    <p className="mt-2 text-2xs italic text-muted-foreground/50">Empty page</p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2 text-3xs text-muted-foreground/70">
                  <span>{words} words</span>
                  <span>{new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </NoteSection>
  )
}
