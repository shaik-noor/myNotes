import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { confirmDialog } from '../../ui/confirm'
import { cn } from '../../ui/utils'
import { Check, ChevronRight, Copy, MoreVertical, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { NoteTreeNode } from '../../../store/useNotesStore'
import { NoteGlyph } from '../noteIcon'

interface NoteTreeRowProps {
  node: NoteTreeNode
  siblings: NoteTreeNode[]
  selectedNoteId: string | null
  expandedNoteIds: Set<string>
  isSelectMode: boolean
  checkedIds: string[]
  onSelectNote: (id: string) => void
  onToggleExpanded: (id: string) => void
  onCreateChild: (parentId: string) => void
  onToggleCheck: (id: string, isChecked: boolean) => void
  onEnterSelect: (id: string) => void
  onTogglePinned: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
  onMove: (
    draggedId: string,
    newParentId: string | null,
    prevSiblingSortKey: string | null,
    nextSiblingSortKey: string | null
  ) => Promise<void>
}

type DropZone = 'above' | 'below' | 'onto' | null

const ROW_ACTION =
  'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground'

export function SelectBox({ checked }: { checked: boolean }): React.JSX.Element {
  return checked ? (
    <span className="flex size-4 shrink-0 items-center justify-center rounded bg-notes text-notes-foreground">
      <Check className="size-3 stroke-[3]" />
    </span>
  ) : (
    <span className="size-4 shrink-0 rounded border border-border/80 bg-background" />
  )
}

export const NoteTreeRow: React.FC<NoteTreeRowProps> = ({
  node,
  siblings,
  selectedNoteId,
  expandedNoteIds,
  isSelectMode,
  checkedIds,
  onSelectNote,
  onToggleExpanded,
  onCreateChild,
  onToggleCheck,
  onEnterSelect,
  onTogglePinned,
  onDuplicate,
  onDelete,
  onMove
}) => {
  const isActive = selectedNoteId === node.id
  const isChecked = checkedIds.includes(node.id)
  const isExpanded = expandedNoteIds.has(node.id)
  const hasChildren = node.children.length > 0
  const siblingsHaveChildren = siblings.some((s) => s.children.length > 0)
  const reserveChevron = hasChildren || siblingsHaveChildren

  const [isDragging, setIsDragging] = useState(false)
  const [dropZone, setDropZone] = useState<DropZone>(null)

  const indentPx = node.depth * 12

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/mynotes-note-id', node.id)
    setIsDragging(true)
  }

  const handleDragEnd = (): void => {
    setIsDragging(false)
    setDropZone(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    const zone: DropZone = y < h * 0.25 ? 'above' : y > h * 0.75 ? 'below' : 'onto'
    setDropZone(zone)
  }

  const handleDragLeave = (): void => {
    setDropZone(null)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/mynotes-note-id')
    if (!draggedId || draggedId === node.id || !dropZone) {
      setDropZone(null)
      return
    }

    if (dropZone === 'onto') {
      const lastChild = node.children.length > 0 ? node.children[node.children.length - 1] : null
      await onMove(draggedId, node.id, lastChild?.sortKey ?? null, null)
    } else {
      const parentId = node.parentId ?? null
      const ordered = siblings.filter((s) => s.id !== draggedId)
      const idx = ordered.findIndex((s) => s.id === node.id)
      if (dropZone === 'above') {
        const prev = idx > 0 ? ordered[idx - 1] : null
        await onMove(draggedId, parentId, prev?.sortKey ?? null, node.sortKey ?? null)
      } else {
        const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null
        await onMove(draggedId, parentId, node.sortKey ?? null, next?.sortKey ?? null)
      }
    }

    setDropZone(null)
  }

  const handleDelete = async (): Promise<void> => {
    if (!hasChildren) {
      const ok = await confirmDialog({
        title: 'Delete page?',
        description: `"${node.title || 'Untitled'}" will be deleted.`,
        confirmText: 'Delete',
        destructive: true
      })
      if (!ok) return
    }
    await onDelete(node.id)
  }

  const activate = (): void => {
    if (isSelectMode) onToggleCheck(node.id, isChecked)
    else onSelectNote(node.id)
  }

  const dropIndicatorClass =
    dropZone === 'above'
      ? 'before:absolute before:inset-x-1 before:top-0 before:h-0.5 before:rounded-full before:bg-notes'
      : dropZone === 'below'
        ? 'after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full after:bg-notes'
        : dropZone === 'onto'
          ? 'bg-notes/10 ring-1 ring-notes/60 ring-inset'
          : ''

  return (
    <div className={cn(isDragging && 'opacity-40')}>
      <div
        draggable={!isSelectMode}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'group/note-item relative flex w-full items-center rounded-md transition-colors',
          isActive
            ? 'bg-notes/12 font-medium text-foreground shadow-3xs'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
          isSelectMode && isChecked && !isActive && 'bg-notes/6',
          dropIndicatorClass
        )}
      >
        <div
          role="button"
          tabIndex={0}
          aria-current={isActive ? 'page' : undefined}
          onClick={activate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              activate()
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (!isSelectMode) onEnterSelect(node.id)
          }}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          style={{ paddingLeft: `${indentPx + 6}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpanded(node.id)
              }}
              className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground/70 hover:bg-accent hover:text-foreground"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={cn(
                  'size-3.5 transition-transform duration-150',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          ) : reserveChevron ? (
            <div className="size-4 shrink-0" />
          ) : null}

          {isSelectMode ? (
            <SelectBox checked={isChecked} />
          ) : (
            <NoteGlyph icon={node.icon} isBook={hasChildren} active={isActive} />
          )}

          <span className="truncate text-xs">{node.title || 'Untitled'}</span>

          {!isSelectMode && (node.pinned || hasChildren) && (
            <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
              {node.pinned && (
                <Pin className="size-3 fill-notes/25 text-notes" aria-label="Pinned" />
              )}
              {hasChildren && (
                <span className="rounded-full bg-muted/70 px-1.5 text-2xs font-medium tabular-nums text-muted-foreground">
                  {node.children.length}
                </span>
              )}
            </span>
          )}
        </div>

        {!isSelectMode && (
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-border/60 bg-popover/90 p-0.5 text-popover-foreground opacity-0 shadow-md backdrop-blur-md transition-opacity duration-150 group-hover/note-item:opacity-100 group-focus-within/note-item:opacity-100 has-[[data-state=open]]:opacity-100">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateChild(node.id)
                  }}
                  className={ROW_ACTION}
                  aria-label={hasChildren ? 'Add page to book' : 'Add sub-page'}
                >
                  <Plus className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {hasChildren ? 'Add page to book' : 'Add sub-page'}
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={ROW_ACTION} aria-label="Page actions">
                  <MoreVertical className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  onClick={() => void onTogglePinned(node.id)}
                  className="cursor-pointer gap-2 text-xs"
                >
                  {node.pinned ? (
                    <>
                      <PinOff className="size-3.5" /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="size-3.5" /> Pin to top
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onDuplicate(node.id)}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <Trash2 className="size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-1 w-px bg-border/70"
            style={{ left: `${indentPx + 13}px` }}
          />
          {node.children.map((child) => (
            <NoteTreeRow
              key={child.id}
              node={child}
              siblings={node.children}
              selectedNoteId={selectedNoteId}
              expandedNoteIds={expandedNoteIds}
              isSelectMode={isSelectMode}
              checkedIds={checkedIds}
              onSelectNote={onSelectNote}
              onToggleExpanded={onToggleExpanded}
              onCreateChild={onCreateChild}
              onToggleCheck={onToggleCheck}
              onEnterSelect={onEnterSelect}
              onTogglePinned={onTogglePinned}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

