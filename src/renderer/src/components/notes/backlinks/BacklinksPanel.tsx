import { ArrowUpRight, Link2 } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { NoteSection } from '../editor/NoteSection'
import { NoteGlyph } from '../noteIcon'

interface BacklinksPanelProps {
  noteId: string
  onNavigate: (id: string) => void
  getBacklinks: (
    noteId: string
  ) => Promise<Array<{ id: string; title: string; icon: string | null; parentId: string | null }>>
}

/**
 * Backlinks panel: a collapsible section at the bottom of the note document
 * showing pages that reference this note.
 */
export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  noteId,
  onNavigate,
  getBacklinks
}) => {
  const [backlinks, setBacklinks] = useState<
    Array<{ id: string; title: string; icon: string | null; parentId: string | null }>
  >([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    getBacklinks(noteId)
      .then((links) => {
        setBacklinks(links)
        setIsOpen(links.length > 0)
      })
      .catch((err) => {
        console.error('Failed to fetch backlinks:', err)
        setBacklinks([])
        setIsOpen(false)
      })
      .finally(() => setLoading(false))
  }, [noteId, getBacklinks])

  const count = backlinks.length

  if (count === 0) return null

  return (
    <NoteSection
      icon={Link2}
      label="Linked mentions"
      count={count}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className="flex flex-col gap-0.5">
        {loading && <span className="text-2xs italic text-muted-foreground/60">Refreshing…</span>}
        {backlinks.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => onNavigate(link.id)}
            className="group/link flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-notes/50 focus-visible:outline-none"
          >
            <NoteGlyph icon={link.icon} className="group-hover/link:text-notes" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground/85 group-hover/link:text-foreground">
              {link.title || 'Untitled'}
            </span>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover/link:text-muted-foreground" />
          </button>
        ))}
      </div>
    </NoteSection>
  )
}

