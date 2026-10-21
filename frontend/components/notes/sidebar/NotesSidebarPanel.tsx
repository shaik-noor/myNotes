import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  Cloud,
  CloudOff,
  Copy,
  Download,
  FileText,
  Filter,
  LayoutGrid,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { CloudSyncConfig } from '../../../types/notes'
import type { SettingsTab } from '../../SettingsDialog'
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
import { ScrollableList } from '../../ui/ScrollableList'
import { Skeleton } from '../../ui/skeleton'
import { toast } from '../../ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { cn } from '../../ui/utils'
import { NoteGlyph } from '../noteIcon'
import { NoteTreeRow, SelectBox } from './NoteTreeRow'

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

interface NotesSidebarPanelProps {
  onNavigate?: () => void
  onOpenSettings?: (tab?: SettingsTab) => void
}

export function NotesSidebarPanel({
  onNavigate,
  onOpenSettings
}: NotesSidebarPanelProps): React.JSX.Element {
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig | null>(null)

  useEffect(() => {
    void window.api?.cloud?.getConfig?.().then((res) => {
      if (res?.success && res.data) {
        setCloudConfig(res.data)
      }
    })
    const unsub = window.api?.cloud?.onVaultUpdated?.(() => {
      void window.api?.cloud?.getConfig?.().then((res) => {
        if (res?.success && res.data) {
          setCloudConfig(res.data)
        }
      })
    })
    return () => {
      unsub?.()
    }
  }, [])

  const notes = useNotesStore((s) => s.notes)
  const notesLoaded = useNotesStore((s) => s.notesLoaded)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const activeHomeTab = useNotesStore((s) => s.activeHomeTab)
  const setActiveHomeTab = useNotesStore((s) => s.setActiveHomeTab)
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
  const [showAllNotebooks, setShowAllNotebooks] = useState(false)
  const [pinnedFilter, setPinnedFilter] = useState(false)

  const activeTagStillExists = !!activeTag && notes.some((n) => (n.tags ?? []).includes(activeTag))
  useEffect(() => {
    if (activeTag && !activeTagStillExists) setActiveTag(null)
  }, [activeTag, activeTagStillExists])

  const parentIds = useMemo(
    () => new Set(notes.map((n) => n.parentId).filter(Boolean) as string[]),
    [notes]
  )
  const notebookNotes = useMemo(
    () => notes.filter((n) => parentIds.has(n.id)),
    [notes, parentIds]
  )
  const displayedNotebooks = showAllNotebooks ? notebookNotes : notebookNotes.slice(0, 4)

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
      .filter((n) => (pinnedFilter ? n.pinned : true))
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
        const at = a.updatedAt || a.createdAt || ''
        const bt = b.updatedAt || b.createdAt || ''
        return bt.localeCompare(at)
      })
  }, [notes, notesSearchQuery, activeTag, pinnedFilter])

  const showTree = !notesSearchQuery.trim() && !activeTag && !pinnedFilter
  const noteTree = useMemo(() => (showTree ? buildNoteTree(notes) : []), [notes, showTree])

  const visibleIds = showTree
    ? noteTree.map((n) => n.id)
    : filteredNotes.map((n) => n.id)
  const allVisibleChecked =
    visibleIds.length > 0 && visibleIds.every((id) => checkedIds.includes(id))
  const listCount = showTree ? noteTree.length : filteredNotes.length

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

  const triggerOpenSettings = (tab?: SettingsTab) => {
    if (onOpenSettings) {
      onOpenSettings(tab)
    } else {
      window.dispatchEvent(new CustomEvent('mynotes:open-settings'))
    }
  }

  if (!notesLoaded && notes.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-3" aria-busy="true">
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex flex-col gap-1.5 mt-2">
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
    <div className="notes-sidebar-panel flex h-full min-h-0 flex-col justify-between p-3 select-none text-sidebar-foreground">
      <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
        {/* Top Prominent Action: "+ New note" capsule */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={newNote}
            className="flex h-10 flex-1 items-center gap-2.5 rounded-full bg-card hover:bg-card/80 text-foreground px-4 text-sm font-medium border border-border/70 shadow-2xs hover:shadow-xs transition-all"
          >
            <Plus className="size-4 text-notes stroke-[2.5]" />
            <span>New note</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More creation options"
                className="flex size-10 items-center justify-center rounded-full bg-card hover:bg-card/80 border border-border/70 text-muted-foreground hover:text-foreground shadow-2xs transition-all"
              >
                <ChevronDown className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1">
              <DropdownMenuItem
                onClick={newNote}
                className="gap-2.5 rounded-md py-2 text-xs cursor-pointer"
              >
                <FileText className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold text-foreground">New page</div>
                  <div className="text-2xs text-muted-foreground">Blank canvas to write</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void newBook()}
                className="gap-2.5 rounded-md py-2 text-xs cursor-pointer"
              >
                <BookOpen className="size-4 text-notes" />
                <div>
                  <div className="font-semibold text-foreground">New notebook</div>
                  <div className="text-2xs text-muted-foreground">Keep pages together</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedNoteId(null)
                  setActiveHomeTab('templates')
                  onNavigate?.()
                  requestAnimationFrame(() =>
                    window.dispatchEvent(new Event('notes:open-templates'))
                  )
                }}
                className="gap-2.5 rounded-md py-2 text-xs cursor-pointer"
              >
                <Sparkles className="size-4 text-amber-500" />
                <div>
                  <div className="font-semibold text-foreground">From template…</div>
                  <div className="text-2xs text-muted-foreground">Project, meeting, research</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleImport()}
                className="gap-2.5 rounded-md py-2 text-xs cursor-pointer"
              >
                <Download className="size-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold text-foreground">Import file…</div>
                  <div className="text-2xs text-muted-foreground">Markdown, HTML, or text</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Primary Navigation Items (Library, Templates, Starred) */}
        {(() => {
          const isLibraryActive = !selectedNoteId && activeHomeTab === 'notes'
          const isTemplatesActive = !selectedNoteId && activeHomeTab === 'templates'
          return (
            <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
              {/* Library / Home */}
              <button
                type="button"
                aria-current={isLibraryActive ? 'page' : undefined}
                onClick={() => {
                  setSelectedNoteId(null)
                  setActiveHomeTab('notes')
                  onNavigate?.()
                  window.dispatchEvent(new Event('notes:open-library'))
                }}
                className={cn(
                  'flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-normal transition-colors',
                  isLibraryActive
                    ? 'bg-sidebar-accent font-medium text-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <LayoutGrid className={cn('size-4', isLibraryActive ? 'text-notes' : 'text-muted-foreground')} />
                <span>Library</span>
              </button>

              {/* Templates */}
              <button
                type="button"
                aria-current={isTemplatesActive ? 'page' : undefined}
                onClick={() => {
                  setSelectedNoteId(null)
                  setActiveHomeTab('templates')
                  onNavigate?.()
                  window.dispatchEvent(new Event('notes:open-templates'))
                }}
                className={cn(
                  'flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-normal transition-colors',
                  isTemplatesActive
                    ? 'bg-sidebar-accent font-medium text-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <Sparkles
                  className={cn(
                    'size-4 transition-colors',
                    isTemplatesActive ? 'text-amber-500' : 'text-amber-500/80'
                  )}
                />
                <span>Templates</span>
              </button>

              {/* Starred / Pinned filter */}
              <button
                type="button"
                onClick={() => setPinnedFilter((v) => !v)}
                className={cn(
                  'flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-normal transition-colors',
                  pinnedFilter
                    ? 'bg-notes/10 font-medium text-notes'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <Pin className={cn('size-4', pinnedFilter ? 'fill-notes text-notes' : 'text-muted-foreground')} />
                <span>Starred</span>
              </button>
            </nav>
          )
        })()}

        {/* Search Input Box */}
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={notesSearchQuery}
            onChange={(e) => setNotesSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && notesSearchQuery) {
                e.preventDefault()
                setNotesSearchQuery('')
              }
            }}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-9 w-full rounded-full border border-border/60 bg-card/60 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none"
          />
          {notesSearchQuery && (
            <button
              type="button"
              onClick={() => setNotesSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Section: Notebooks */}
        {notebookNotes.length > 0 && !notesSearchQuery && !pinnedFilter && (
          <div className="flex flex-col gap-1 shrink-0 pt-1">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-semibold text-muted-foreground tracking-tight">
                Notebooks
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void newBook()}
                    aria-label="New notebook"
                    className="flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">New notebook</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-col gap-0.5">
              {displayedNotebooks.map((nb) => {
                const isActive = selectedNoteId === nb.id
                return (
                  <button
                    key={nb.id}
                    type="button"
                    onClick={() => {
                      setSelectedNoteId(nb.id)
                      toggleNoteExpanded(nb.id)
                      onNavigate?.()
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-xs font-normal transition-colors',
                      isActive
                        ? 'bg-sidebar-accent font-medium text-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground'
                    )}
                  >
                    <span className="text-sm shrink-0">
                      {nb.icon || '📁'}
                    </span>
                    <span className="truncate flex-1">{nb.title || 'Untitled notebook'}</span>
                  </button>
                )
              })}

              {notebookNotes.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllNotebooks((v) => !v)}
                  className="flex items-center gap-2 rounded-xl px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40 transition-colors"
                >
                  <span>... {showAllNotebooks ? 'Fewer notebooks' : 'All notebooks'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section: All Notes List (with Filter & Multi-select) */}
        <div className="flex min-h-0 flex-1 flex-col gap-1 pt-1">
          <div className="flex h-6 items-center justify-between px-3">
            <span className="text-xs font-semibold text-muted-foreground tracking-tight">
              {showTree ? 'All' : 'Results'}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-2xs font-medium tabular-nums text-muted-foreground">
                {listCount}
              </span>
              {/* Filter / Sort Dropdown */}
              {allTags.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Filter"
                      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <Filter className="size-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 text-xs">
                    <DropdownMenuItem onClick={() => setActiveTag(null)}>
                      All tags
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {allTags.map((tag) => (
                      <DropdownMenuItem key={tag} onClick={() => setActiveTag(tag)}>
                        #{tag}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!isSelectMode && listCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => enterSelect()}
                      aria-label="Select multiple"
                      className="flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <CheckSquare className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Select multiple</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {isSelectMode && (
            <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-notes/25 bg-notes/6 px-2.5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
            <div className="flex flex-col gap-0.5 py-0.5">
              {showTree ? (
                noteTree.length === 0 ? (
                  <EmptyState
                    compact
                    icon={FileText}
                    title="No pages yet"
                    description="Click + New note to start writing."
                  />
                ) : (
                  noteTree.map((node) => (
                    <NoteTreeRow
                      key={node.id}
                      node={node}
                      siblings={noteTree}
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
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  compact
                  icon={Search}
                  title="No matches"
                  description="Nothing matches your current search or filter."
                />
              ) : (
                filteredNotes.map((note) => {
                  const isActive = selectedNoteId === note.id
                  const isChecked = checkedIds.includes(note.id)
                  return (
                    <div
                      key={note.id}
                      className={cn(
                        'group/note-item relative flex w-full items-center rounded-xl transition-colors',
                        isActive
                          ? 'bg-sidebar-accent font-medium text-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground'
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
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl py-1.5 pl-2.5 pr-2 text-left outline-none"
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
                        <span className="truncate text-xs">{note.title || 'Untitled page'}</span>
                        <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                          {note.pinned && (
                            <Pin
                              className="size-3 fill-notes text-notes"
                              aria-label="Pinned"
                            />
                          )}
                          <span className="text-2xs tabular-nums text-muted-foreground/60 group-hover/note-item:opacity-0">
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
                                    <Pin className="size-3.5" /> Pin
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
                                  const ok = await confirmDialog({
                                    title: 'Delete page?',
                                    description: `"${note.title || 'Untitled'}" will be deleted.`,
                                    confirmText: 'Delete',
                                    destructive: true
                                  })
                                  if (!ok) return
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
      </div>

      {/* Bottom Drive Connect Status Card */}
      <div className="pt-2 shrink-0 border-t border-border/40">
        <button
          type="button"
          onClick={() => triggerOpenSettings('cloud')}
          className="flex w-full items-center gap-2.5 rounded-2xl p-2 text-left hover:bg-sidebar-accent/60 transition-all group"
        >
          {cloudConfig?.isConnected ? (
            cloudConfig.userPicture ? (
              <img
                src={cloudConfig.userPicture}
                alt={cloudConfig.userName || 'Google Drive user'}
                className="size-8 shrink-0 rounded-full border border-border/60 object-cover shadow-2xs"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[#1a73e8] border border-blue-500/20 shadow-2xs">
                <Cloud className="size-4" />
              </div>
            )
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-2xs">
              <CloudOff className="size-4" />
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-medium text-foreground">
              {cloudConfig?.isConnected
                ? cloudConfig.userName || cloudConfig.userEmail || 'Google Drive'
                : 'Google Drive'}
            </span>
            <span className="text-2xs text-muted-foreground font-normal flex items-center gap-1">
              {cloudConfig?.isConnected ? (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">
                    {cloudConfig.isSyncing ? 'Syncing…' : 'Connected · Synced'}
                  </span>
                </>
              ) : (
                'Not connected · Local only'
              )}
            </span>
          </div>

          <Settings className="size-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:rotate-45 transition-all" />
        </button>
      </div>
    </div>
  )
}
