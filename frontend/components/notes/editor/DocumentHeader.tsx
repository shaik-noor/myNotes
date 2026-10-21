import type { Editor } from '@tiptap/react'
import {
  BookOpen,
  ClipboardCopy,
  Copy,
  Download,
  FileText,
  Focus,
  ListTree,
  MoreHorizontal,
  Pin,
  PinOff,
  StretchHorizontal,
  Trash2
} from 'lucide-react'
import type React from 'react'
import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../ui/dropdown-menu'
import { StatusDot } from '../../ui/status-dot'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { cn } from '../../ui/utils'
import { OPEN_FIND_REPLACE_EVENT } from './searchHighlight'
import { HeaderSearchBox } from './HeaderSearchBox'

interface DocumentHeaderProps {
  saveStatus: 'saved' | 'saving' | 'error'
  /** Whether the note has sub-pages (is a Book). */
  isBook?: boolean
  /** Number of sub-pages if this note is a Book. */
  subPageCount?: number
  /** Whether the note has any content (gates "Copy as Markdown"). */
  hasContent: boolean
  focusMode: boolean
  outlineOpen: boolean
  /** Whether the current note is pinned (drives the pin/unpin label + icon). */
  pinned: boolean
  /** Whether the page content spans the full canvas width. */
  fullWidth: boolean
  /** The editor instance — powers the always-visible "Search this page" box. */
  editor: Editor | null
  onToggleFocus: () => void
  onToggleOutline: () => void
  onToggleFullWidth: () => void
  onTogglePinned: () => void
  onDuplicate: () => void
  /** Copy the whole page as Markdown source (plain copy gives plain text). */
  onCopyMarkdown: () => void
  onExport: () => void
  onDelete: () => void
}

/** A tooltipped icon toggle inside the header's grouped view cluster. */
function HeaderToggle({
  label,
  active,
  onClick,
  children
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors',
            active
              ? 'bg-background text-notes shadow-2xs'
              : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The slim, sticky document-level header.
 */
export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  saveStatus,
  isBook = false,
  subPageCount = 0,
  hasContent,
  focusMode,
  outlineOpen,
  pinned,
  fullWidth,
  editor,
  onToggleFocus,
  onToggleOutline,
  onToggleFullWidth,
  onTogglePinned,
  onDuplicate,
  onCopyMarkdown,
  onExport,
  onDelete
}) => {
  const kind = isBook ? 'Notebook' : 'Page'
  const KindIcon = isBook ? BookOpen : FileText
  const saving = saveStatus === 'saving'

  return (
    <div
      data-slot="note-doc-header"
      className="sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between gap-2 bg-background px-3 select-none transition-colors transform-[translateZ(0)] isolation-isolate md:px-6"
    >
      {/* Kind + title + save state */}
      <div className="flex min-w-0 items-center gap-2 text-xs">
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-semibold',
            isBook
              ? 'border-notes/30 bg-notes/10 text-notes'
              : 'border-border/60 bg-muted/50 text-muted-foreground'
          )}
        >
          <KindIcon className="size-3" />
          {kind}
          {isBook && subPageCount > 0 && (
            <span className="font-medium tabular-nums opacity-80">· {subPageCount}</span>
          )}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span role="status" aria-live="polite" className="flex shrink-0 items-center">
              <StatusDot
                tone={saveStatus === 'error' ? 'error' : saving ? 'running' : 'done'}
                pulse={saving}
                label={saveStatus === 'error' ? 'Not saved' : saving ? 'Saving…' : 'Saved'}
                className="text-2xs font-medium text-muted-foreground"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {saveStatus === 'error'
              ? 'Could not save. Press Ctrl+S or ⌘S to try again.'
              : saving
                ? 'Saving…'
                : 'All changes saved'}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Always-visible "search this page" box */}
        <div className="hidden md:block">
          <HeaderSearchBox editor={editor} />
        </div>

        {/* View cluster */}
        <div className="hidden items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5 sm:flex">
          <HeaderToggle label="On this page" active={outlineOpen} onClick={onToggleOutline}>
            <ListTree className="size-3.5" />
          </HeaderToggle>
          <HeaderToggle
            label={fullWidth ? 'Centered column' : 'Full width'}
            active={fullWidth}
            onClick={onToggleFullWidth}
          >
            <StretchHorizontal className="size-3.5" />
          </HeaderToggle>
          <HeaderToggle
            label={focusMode ? 'Exit focus mode' : 'Focus mode'}
            active={focusMode}
            onClick={onToggleFocus}
          >
            <Focus className="size-3.5" />
          </HeaderToggle>
        </div>

        {/* Pin toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onTogglePinned}
              aria-label={pinned ? 'Unpin' : 'Pin to top'}
              aria-pressed={pinned}
              className={cn(
                'hidden cursor-pointer rounded-lg sm:inline-flex',
                pinned ? 'text-notes' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Pin className={cn('size-4', pinned && 'fill-notes/25')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{pinned ? 'Unpin' : 'Pin to top'}</TooltipContent>
        </Tooltip>

        {/* Overflow: duplicate / copy / export / delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More actions"
              className="cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new Event(OPEN_FIND_REPLACE_EVENT))}
              className="md:hidden"
            >
              Find in page
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleOutline} className="sm:hidden">
              {outlineOpen ? 'Hide outline' : 'Show outline'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFullWidth} className="sm:hidden">
              {fullWidth ? 'Use centered page' : 'Use full width'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFocus} className="sm:hidden">
              {focusMode ? 'Exit focus mode' : 'Focus mode'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onTogglePinned}
              className="cursor-pointer gap-2 text-xs sm:hidden"
            >
              {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              {pinned ? 'Unpin' : 'Pin to top'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer gap-2 text-xs">
              <Copy className="size-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCopyMarkdown}
              disabled={!hasContent}
              className="cursor-pointer gap-2 text-xs"
            >
              <ClipboardCopy className="size-3.5" />
              Copy as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport} className="cursor-pointer gap-2 text-xs">
              <Download className="size-3.5" />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={onDelete}
              className="cursor-pointer gap-2 text-xs"
            >
              <Trash2 className="size-3.5" />
              Delete {kind.toLowerCase()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
