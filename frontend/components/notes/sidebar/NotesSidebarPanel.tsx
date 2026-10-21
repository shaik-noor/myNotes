import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Hash,
  Home,
  MoreVertical,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { buildNoteTree, useNotesStore } from '../../../store/useNotesStore'
import { Button } from '../../ui/button'
import { confirmDialog } from '../../ui/confirm'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../ui/dropdown-menu'
import { EmptyState } from '../../ui/EmptyState'
import { springTransition } from '../../ui/motion'
import { ScrollableList } from '../../ui/ScrollableList'
import { Skeleton } from '../../ui/skeleton'
import { toast } from '../../ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { cn } from '../../ui/utils'
import { NoteGlyph } from '../noteIcon'
import { NoteTreeRow, SelectBox } from './NoteTreeRow'

type NotesTab = 'all' | 'books'

const SECTION_LABEL = 'text-xs font-medium text-muted-foreground'

export function shortAge(iso?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const mins = Math.round((Date.now() - t) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function useNoteCreation(): {
  newNote: () => void
  newBook: () => Promise<void>
  importing: boolean
  handleImport: () => Promise<void>
} {
  const createNote = useNotesStore((s) => s.createNote)
  const createChildPage = useNotesStore((s) => s.createChildPage)
  const importNote = useNotesStore((s) => s.importNote)
  const [importing, setImporting] = useState(false)

  const newBook = async (): Promise<void> => {
    const parentId = await createNote('Untitled notebook')
    if (parentId) await createChildPage(parentId, 'Untitled page')
  }

  const handleImport = async (): Promise<void> => {
    setImporting(true)
    try {
      const result = await window.api.notes.importLocalFile()
      if (!result) return
      if (result.error) {
        toast.error('Import failed', { description: result.error })
        return
      }
      if (result.type === 'pages' && Array.isArray(result.pages)) {
        if (result.pages.length === 0) {
          toast.info('Nothing to import', {
            description: 'No pages were found in this file.'
          })
          return
        }
        let bookId: string | null = null
        if (result.pages.length > 1) {
          bookId = await importNote(result.notebookTitle || 'Imported Notebook', '')
          if (!bookId) return
        }
        for (const page of result.pages) {
          if (!(await importNote(page.title, page.content, bookId))) return
        }
        toast.success(`Imported ${result.pages.length} pages${bookId ? ' into a new Book' : ''}`)
      } else if (result.type === 'single') {
        if (!(await importNote(result.title || 'Untitled Note', result.content || ''))) return
        toast.success('Note imported')
      }
    } catch (e: unknown) {
      toast.error('Import failed', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setImporting(false)
    }
  }

  return { newNote: () => void createNote(), newBook, importing, handleImport }
}

export function NotesSidebarPanel({ onNavigate }: { onNavigate?: () => void }): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const notesLoaded = useNotesStore((s) => s.notesLoaded)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const notesSearchQuery = useNotesStore((s) => s.notesSearchQuery)
  const setNotesSearchQuery = useNotesStore((s) => s.setNotesSearchQuery)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const deleteNotes = useNotesStore((s) => s.deleteNotes)
  const toggleNotePinned = useNotesStore((s) => s.toggleNotePinned)
  const duplicateNote = useNotesStore((s) => s.duplicateNote)
  const createChildPage = useNotesStore((s) => s.createChildPage)
  const moveNote = useNotesStore((s) => s.moveNote)
  const expandedNoteIds = useNotesStore((s) => s.expandedNoteIds)
  const toggleNoteExpanded = useNotesStore((s) => s.toggleNoteExpanded)

  const { newNote, newBook, handleImport } = useNoteCreation()

  const [isSelectMode, setIsSelectMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [notesTab, setNotesTab] = useState<NotesTab>('all')

  const activeTagStillExists = !!activeTag && notes.some((n) => (n.tags ?? []).includes(activeTag))
  useEffect(() => {
    if (activeTag && !activeTagStillExists) setActiveTag(null)
  }, [activeTag, activeTagStillExists])

  const parentIds = useMemo(
    () => new Set(notes.map((n) => n.parentId).filter(Boolean) as string[]),
    [notes]
  )
  const booksCount = useMemo(
    () => notes.filter((n) => parentIds.has(n.id)).length,
    [notes, parentIds]
  )
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const n of notes) for (const t of n.tags ?? []) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [notes])

  const filteredNotes = useMemo(() => {
    const q = notesSearchQuery.toLowerCase()
    return notes
      .filter((n) => {
        if (!q) return true
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      })
      .filter((n) => (activeTag ? (n.tags ?? []).includes(activeTag) : true))
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
        const at = a.updatedAt || a.createdAt || ''
        const bt = b.updatedAt || b.createdAt || ''
        return bt.localeCompare(at)
      })
  }, [notes, notesSearchQuery, activeTag])

  const showTree = !notesSearchQuery.trim() && !activeTag
  const noteTree = useMemo(() => (showTree ? buildNoteTree(notes) : []), [notes, showTree])

  const displayedNoteTree = useMemo(() => {
    if (notesTab === 'books') return noteTree.filter((node) => node.children.length > 0)
    return noteTree
  }, [noteTree, notesTab])

  const displayedFilteredNotes = useMemo(() => {
    if (notesTab === 'books') return filteredNotes.filter((n) => parentIds.has(n.id))
    return filteredNotes
  }, [filteredNotes, notesTab, parentIds])

  const visibleIds = showTree
    ? displayedNoteTree.map((n) => n.id)
    : displayedFilteredNotes.map((n) => n.id)
  const allVisibleChecked =
    visibleIds.length > 0 && visibleIds.every((id) => checkedIds.includes(id))
  const listCount = showTree ? displayedNoteTree.length : displayedFilteredNotes.length

  const toggleCheck = (id: string, isChecked: boolean): void => {
    setCheckedIds((cur) => (isChecked ? cur.filter((cid) => cid !== id) : [...cur, id]))
  }
  const enterSelect = (id?: string): void => {
    setIsSelectMode(true)
    setCheckedIds(id ? [id] : [])
  }
  const exitSelect = (): void => {
    setIsSelectMode(false)
    setCheckedIds([])
  }
  const handleBulkDelete = async (): Promise<void> => {
    const n = checkedIds.length
    const ok = await confirmDialog({
      title: `Delete ${n} page${n === 1 ? '' : 's'}?`,
      description: 'Selected pages and their sub-pages will be deleted.',
      confirmText: 'Delete',
      destructive: true
    })
    if (!ok) return
    await deleteNotes(checkedIds, true)
    exitSelect()
  }

  const tabs: { id: NotesTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: notes.length },
    { id: 'books', label: 'Notebooks', count: booksCount }
  ]

  if (!notesLoaded && notes.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-2" aria-busy="true">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex flex-col gap-1">
          {[72, 60, 66, 48, 56].map((w) => (
            <div key={w} className="flex items-center gap-2.5 px-2 py-1.5">
              <Skeleton className="size-4 shrink-0 rounded-md" />
              <Skeleton className="h-3 rounded-md" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 select-none">
      <button
        type="button"
        aria-current={!selectedNoteId ? 'page' : undefined}
        onClick={() => {
          setSelectedNoteId(null)
          onNavigate?.()
        }}
        className={cn(
          'flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
          !selectedNoteId
            ? 'bg-notes/10 font-medium text-notes'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Home className="size-4" />
        Home
      </button>
      <div className="flex shrink-0 items-stretch overflow-hidden rounded-lg border border-border">
        <Button
          size="sm"
          onClick={newNote}
          className="h-9 flex-1 cursor-pointer justify-start gap-2 rounded-r-none bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Plus className="size-4 stroke-[2.5]" />
          New page
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              aria-label="More create options"
              className="h-9 w-9 cursor-pointer rounded-l-none border-l border-border bg-card px-0 text-muted-foreground hover:bg-muted"
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1">
            <CreateMenuItem
              icon={FileText}
              title="New page"
              hint="A place to write"
              onSelect={newNote}
            />
            <CreateMenuItem
              icon={BookOpen}
              tone="text-notes"
              title="New notebook"
              hint="Keep related pages together"
              onSelect={() => void newBook()}
            />
            <CreateMenuItem
              icon={Sparkles}
              tone="text-amber-500"
              title="From template…"
              hint="Meetings, projects, and more"
              onSelect={() => {
                setSelectedNoteId(null)
                onNavigate?.()
                requestAnimationFrame(() => window.dispatchEvent(new Event('notes:open-templates')))
              }}
            />
            <DropdownMenuSeparator />
            <CreateMenuItem
              icon={Download}
              title="Import…"
              hint="Markdown, HTML, or text"
              onSelect={() => void handleImport()}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          compact
          icon={NotebookPen}
          title="Your library is empty"
          description="Create a page or notebook, or import a file."
        />
      ) : (
        <>
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={notesSearchQuery}
              onChange={(e) => setNotesSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && notesSearchQuery) {
                  e.preventDefault()
                  setNotesSearchQuery('')
                }
              }}
              placeholder="Find a page"
              aria-label="Search notes"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-notes/50"
            />
            {notesSearchQuery && (
              <button
                type="button"
                onClick={() => setNotesSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Filter pages"
            className="flex shrink-0 rounded-lg border border-border/40 bg-muted/40 p-0.5"
          >
            {tabs.map((t) => {
              const active = notesTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setNotesTab(t.id)}
                  className={cn(
                    'relative z-0 flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-1.5 py-1 text-2xs font-medium transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="notes-tab-active"
                      transition={springTransition(420, 36)}
                      className="absolute inset-0 -z-10 rounded-md bg-background shadow-2xs"
                    />
                  )}
                  <span className={cn(active && 'font-semibold')}>{t.label}</span>
                  <span
                    className={cn(
                      'tabular-nums',
                      active ? 'text-notes' : 'text-muted-foreground/60'
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>

          {allTags.length > 0 && (
            <details className="shrink-0 rounded-lg px-1 text-xs">
              <summary className="cursor-pointer py-1.5 font-medium text-muted-foreground">
                Tags {activeTag ? `· ${activeTag}` : `· ${allTags.length}`}
              </summary>
              {activeTag && (
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className="mb-2 text-notes"
                >
                  Clear tag filter
                </button>
              )}
              <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto no-scrollbar">
                {allTags.map((tag) => {
                  const active = activeTag === tag
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setActiveTag((cur) => (cur === tag ? null : tag))}
                      aria-pressed={active}
                      className={cn(
                        'flex cursor-pointer items-center gap-0.5 rounded-full border px-2 py-0.5 text-2xs font-medium transition-colors',
                        active
                          ? 'border-notes/40 bg-notes/12 text-notes'
                          : 'border-border/50 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Hash className="size-2.5 opacity-70" />
                      {tag}
                    </button>
                  )
                })}
              </div>
            </details>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="flex h-5 items-center justify-between px-1">
              <span className={SECTION_LABEL}>
                {showTree ? (notesTab === 'books' ? 'Notebooks' : 'Pages') : 'Results'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-medium tabular-nums text-muted-foreground">
                  {listCount}
                </span>
                {!isSelectMode && listCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => enterSelect()}
                        aria-label="Select multiple"
                        className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <CheckSquare className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Select multiple (or double-click a page)
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {isSelectMode && (
              <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-notes/25 bg-notes/6 px-2 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => setCheckedIds(allVisibleChecked ? [] : visibleIds)}
                  className="flex cursor-pointer items-center gap-1.5 text-2xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <SelectBox checked={allVisibleChecked} />
                  {checkedIds.length > 0 ? `${checkedIds.length} selected` : 'Select all'}
                </button>
                <div className="flex gap-1">
                  <Button
                    disabled={checkedIds.length === 0}
                    variant="destructive"
                    size="xs"
                    onClick={() => void handleBulkDelete()}
                    className="h-6 gap-1 px-2 text-2xs"
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={exitSelect}
                    className="h-6 px-2 text-2xs text-muted-foreground"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            <ScrollableList upLabel="Top" downLabel="More">
              <div className="flex flex-col gap-px py-0.5">
                {showTree ? (
                  displayedNoteTree.length === 0 ? (
                    <EmptyState
                      compact
                      icon={notesTab === 'books' ? BookOpen : FileText}
                      title={notesTab === 'books' ? 'No notebooks yet' : 'No standalone notes'}
                      description={
                        notesTab === 'books'
                          ? 'Add a child page to turn a page into a notebook.'
                          : 'Your pages are organized into notebooks.'
                      }
                    />
                  ) : (
                    displayedNoteTree.map((node) => (
                      <NoteTreeRow
                        key={node.id}
                        node={node}
                        siblings={displayedNoteTree}
                        selectedNoteId={selectedNoteId}
                        expandedNoteIds={expandedNoteIds}
                        isSelectMode={isSelectMode}
                        checkedIds={checkedIds}
                        onSelectNote={(id) => {
                          setSelectedNoteId(id)
                          onNavigate?.()
                        }}
                        onToggleExpanded={toggleNoteExpanded}
                        onCreateChild={createChildPage}
                        onToggleCheck={toggleCheck}
                        onEnterSelect={enterSelect}
                        onTogglePinned={toggleNotePinned}
                        onDuplicate={duplicateNote}
                        onDelete={deleteNote}
                        onMove={moveNote}
                      />
                    ))
                  )
                ) : displayedFilteredNotes.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Search}
                    title="No matches"
                    description={
                      activeTag && notesSearchQuery
                        ? `Nothing tagged #${activeTag} matches "${notesSearchQuery}".`
                        : activeTag
                          ? `No pages here are tagged #${activeTag}.`
                          : `Nothing matches "${notesSearchQuery}".`
                    }
                  />
                ) : (
                  displayedFilteredNotes.map((note) => {
                    const isActive = selectedNoteId === note.id
                    const isChecked = checkedIds.includes(note.id)
                    return (
                      <div
                        key={note.id}
                        className={cn(
                          'group/note-item relative flex w-full items-center rounded-md transition-colors',
                          isActive
                            ? 'bg-notes/12 font-medium text-foreground shadow-3xs'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            isSelectMode
                              ? toggleCheck(note.id, isChecked)
                              : setSelectedNoteId(note.id)
                          }
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            if (!isSelectMode) enterSelect(note.id)
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {isSelectMode ? (
                            <SelectBox checked={isChecked} />
                          ) : (
                            <NoteGlyph
                              icon={note.icon}
                              isBook={parentIds.has(note.id)}
                              active={isActive}
                            />
                          )}
                          <span className="truncate text-xs">{note.title || 'Untitled'}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                            {note.pinned && (
                              <Pin
                                className="size-3 fill-notes/25 text-notes"
                                aria-label="Pinned"
                              />
                            )}
                            <span className="text-2xs tabular-nums text-muted-foreground/70 group-hover/note-item:opacity-0">
                              {shortAge(note.updatedAt || note.createdAt)}
                            </span>
                          </span>
                        </button>
                        {!isSelectMode && (
                          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center rounded-md border border-border/60 bg-popover/90 p-0.5 text-popover-foreground opacity-0 shadow-md backdrop-blur-md transition-opacity duration-150 group-hover/note-item:opacity-100 group-focus-within/note-item:opacity-100 has-[[data-state=open]]:opacity-100">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Page actions"
                                  className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  <MoreVertical className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-40">
                                <DropdownMenuItem
                                  onClick={() => void toggleNotePinned(note.id)}
                                  className="cursor-pointer gap-2 text-xs"
                                >
                                  {note.pinned ? (
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
                                  onClick={() => void duplicateNote(note.id)}
                                  className="cursor-pointer gap-2 text-xs"
                                >
                                  <Copy className="size-3.5" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={async () => {
                                    if (!parentIds.has(note.id)) {
                                      const ok = await confirmDialog({
                                        title: 'Delete page?',
                                        description: `"${note.title || 'Untitled'}" will be deleted.`,
                                        confirmText: 'Delete',
                                        destructive: true
                                      })
                                      if (!ok) return
                                    }
                                    await deleteNote(note.id)
                                  }}
                                  className="cursor-pointer gap-2 text-xs"
                                >
                                  <Trash2 className="size-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollableList>
          </div>
        </>
      )}
    </div>
  )
}

function CreateMenuItem({
  icon: Icon,
  title,
  hint,
  tone,
  onSelect
}: {
  icon: typeof FileText
  title: string
  hint: string
  tone?: string
  onSelect: () => void
}): React.JSX.Element {
  return (
    <DropdownMenuItem onClick={onSelect} className="cursor-pointer gap-2.5 rounded-md py-2 text-xs">
      <Icon className={cn('size-4 shrink-0', tone ?? 'text-muted-foreground')} />
      <div className="flex flex-col">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-2xs text-muted-foreground">{hint}</span>
      </div>
    </DropdownMenuItem>
  )
}
