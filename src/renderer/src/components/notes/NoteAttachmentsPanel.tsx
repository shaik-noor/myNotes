import type { NoteAttachment } from '../../types/notes'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { confirmDialog } from '../ui/confirm'
import { toast } from '../ui/toast'
import { cn } from '../ui/utils'
import { Download, ExternalLink, FolderOpen, Paperclip, Plus, Trash2 } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { fileGlyph, formatBytes } from '../ui/fileDisplay'
import { NoteAttachmentsService } from '../../services/noteAttachments'
import { NOTE_ATTACHMENTS_CHANGED_EVENT } from './editor/attachmentEvents'
import { NoteSection } from './editor/NoteSection'

interface NoteAttachmentsPanelProps {
  noteId: string
}

export const NoteAttachmentsPanel: React.FC<NoteAttachmentsPanelProps> = ({ noteId }) => {
  const [files, setFiles] = useState<NoteAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const load = useCallback(
    (autoExpand: boolean) => {
      setLoading(true)
      NoteAttachmentsService.list(noteId)
        .then((list) => {
          setFiles(list)
          if (autoExpand) setIsOpen(list.length > 0)
        })
        .catch(() => setFiles([]))
        .finally(() => setLoading(false))
    },
    [noteId]
  )

  useEffect(() => {
    load(true)
  }, [load])

  useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ noteId: string }>).detail
      if (detail?.noteId === noteId) load(false)
    }
    window.addEventListener(NOTE_ATTACHMENTS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(NOTE_ATTACHMENTS_CHANGED_EVENT, handler)
  }, [noteId, load])

  const handleAttach = useCallback(async () => {
    const added = await NoteAttachmentsService.attachFiles(noteId)
    const errored = added.filter((a) => a.error)
    for (const a of errored) toast.error(`Could not attach ${a.name}`, { description: a.error })
    if (added.some((a) => !a.error)) {
      setIsOpen(true)
      load(false)
    }
  }, [noteId, load])

  const handleSave = async (id?: string): Promise<void> => {
    if (!id) return
    const path = await NoteAttachmentsService.saveAs(id)
    if (path) toast.success('File saved', { description: path })
  }
  const handleOpen = async (id?: string): Promise<void> => {
    if (!id) return
    if (!(await NoteAttachmentsService.open(id))) toast.error('Could not open file')
  }
  const handleReveal = async (id?: string): Promise<void> => {
    if (!id) return
    if (!(await NoteAttachmentsService.reveal(id))) toast.error('Could not reveal file')
  }
  const handleRemove = async (att: NoteAttachment): Promise<void> => {
    if (!att.id) return
    const ok = await confirmDialog({
      title: 'Remove attachment?',
      description: `"${att.name}" will be deleted from this note. Any inline reference will stop resolving.`,
      confirmText: 'Remove',
      destructive: true
    })
    if (!ok) return
    if (await NoteAttachmentsService.remove(att.id)) {
      load(false)
    } else {
      toast.error('Could not remove attachment')
    }
  }

  const count = files.length

  return (
    <NoteSection
      icon={Paperclip}
      label="Attachments"
      count={count}
      open={isOpen}
      onOpenChange={setIsOpen}
      action={
        <Button
          variant="ghost"
          size="xs"
          onClick={handleAttach}
          className="cursor-pointer gap-1 rounded-md text-muted-foreground hover:text-notes"
        >
          <Plus className="size-3.5" />
          Attach
        </Button>
      }
    >
      <div className="flex flex-col gap-0.5">
        {loading && count === 0 ? (
          <span className="text-2xs italic text-muted-foreground/60">Loading…</span>
        ) : count === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-3">
            <Paperclip className="size-4 shrink-0 text-muted-foreground/50" />
            <span className="text-2xs text-muted-foreground">
              No attachments yet. Use <span className="font-medium text-foreground">Attach</span>,
              the{' '}
              <kbd className="rounded border border-border/60 bg-background px-1 font-mono">/</kbd>{' '}
              menu, or paste / drop a file into the page.
            </span>
          </div>
        ) : (
          files.map((f) => {
            const Icon = fileGlyph(f.ext)
            return (
              <div
                key={f.id}
                className="group/att flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-card/60">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <button
                  type="button"
                  onClick={() => void handleOpen(f.id)}
                  className="min-w-0 flex-1 cursor-pointer truncate text-left text-xs font-medium text-foreground/90 hover:text-foreground hover:underline"
                  title={`Open ${f.name}`}
                >
                  {f.name}
                </button>
                <span className="shrink-0 text-2xs text-muted-foreground tabular-nums">
                  {formatBytes(f.size)}
                </span>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/att:opacity-100 group-hover/att:opacity-100">
                  <RowAction label="Save a copy…" onClick={() => void handleSave(f.id)}>
                    <Download className="size-3.5" />
                  </RowAction>
                  <RowAction label="Reveal in folder" onClick={() => void handleReveal(f.id)}>
                    <FolderOpen className="size-3.5" />
                  </RowAction>
                  <RowAction label="Open with default app" onClick={() => void handleOpen(f.id)}>
                    <ExternalLink className="size-3.5" />
                  </RowAction>
                  <RowAction
                    label="Remove attachment"
                    destructive
                    onClick={() => void handleRemove(f)}
                  >
                    <Trash2 className="size-3.5" />
                  </RowAction>
                </div>
              </div>
            )
          })
        )}
      </div>
    </NoteSection>
  )
}

function RowAction({
  label,
  destructive,
  onClick,
  children
}: {
  label: string
  destructive?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          aria-label={label}
          className={cn(
            'cursor-pointer text-muted-foreground',
            destructive ? 'hover:text-destructive' : 'hover:text-foreground'
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
