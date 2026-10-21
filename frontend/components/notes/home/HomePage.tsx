import {
  BookOpen,
  ChevronDown,
  Download,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Sparkles,
  X
} from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Note } from '../../../types/notes'
import { Button } from '../../ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../ui/dropdown-menu'
import { Sheet, SheetContent } from '../../ui/sheet'
import { toast } from '../../ui/toast'
import { cn } from '../../ui/utils'
import { NoteGlyph } from '../noteIcon'
import { shortAge } from '../sidebar/NotesSidebarPanel'
import { NOTE_TEMPLATES, type NoteTemplate } from './noteTemplates'

export function stripMarkdown(content = ''): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s|>\s|[-*+]\s(?:\[[ xX]\]\s)?)/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface HomePageProps {
  notes: Note[]
  onOpenNote: (id: string) => void
  onCreateNote: (
    title?: string,
    parentId?: string | null,
    content?: string,
    options?: { icon?: string; tags?: string[] }
  ) => Promise<string>
  onNewBook: () => Promise<void>
  onImport: () => Promise<void>
  importing: boolean
  onTogglePinned: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<string | null>
  onDelete: (id: string) => Promise<void>
}

type LibraryFilter = 'all' | 'pinned' | 'notebooks'
type LibrarySort = 'updated' | 'created' | 'title'

export const HomePage: React.FC<HomePageProps> = ({
  notes,
  onOpenNote,
  onCreateNote,
  onNewBook,
  onImport,
  importing,
  onTogglePinned,
  onDuplicate,
  onDelete
}) => {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [sort, setSort] = useState<LibrarySort>('updated')
  const [tag, setTag] = useState('')
  const [view, setView] = useState<'list' | 'grid'>(() =>
    localStorage.getItem('mynotes:library-view') === 'grid' ? 'grid' : 'list'
  )
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [quickNoteOpen, setQuickNoteOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState(
    () => localStorage.getItem('mynotes:scratchpad-title') || ''
  )
  const [draft, setDraft] = useState(() => localStorage.getItem('mynotes:scratchpad-content') || '')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    localStorage.setItem('mynotes:library-view', view)
  }, [view])
  useEffect(() => {
    localStorage.setItem('mynotes:scratchpad-title', draftTitle)
  }, [draftTitle])
  useEffect(() => {
    localStorage.setItem('mynotes:scratchpad-content', draft)
  }, [draft])
  useEffect(() => {
    const open = () => setTemplatesOpen(true)
    window.addEventListener('notes:open-templates', open)
    return () => window.removeEventListener('notes:open-templates', open)
  }, [])

  const parents = useMemo(
    () => new Set(notes.map((note) => note.parentId).filter(Boolean)),
    [notes]
  )
  const tags = useMemo(() => [...new Set(notes.flatMap((note) => note.tags ?? []))].sort(), [notes])
  const titles = useMemo(() => new Map(notes.map((note) => [note.id, note.title])), [notes])
  const filtered = useMemo(
    () =>
      notes
        .filter((note) => {
          const text = query.trim().toLowerCase()
          return (
            (!text || `${note.title} ${note.content}`.toLowerCase().includes(text)) &&
            (filter !== 'pinned' || note.pinned) &&
            (filter !== 'notebooks' || parents.has(note.id)) &&
            (!tag || note.tags?.includes(tag))
          )
        })
        .sort((a, b) =>
          sort === 'title'
            ? a.title.localeCompare(b.title)
            : (sort === 'created' ? b.createdAt : b.updatedAt || b.createdAt).localeCompare(
                sort === 'created' ? a.createdAt : a.updatedAt || a.createdAt
              )
        ),
    [notes, query, filter, parents, tag, sort]
  )

  const saveQuickNote = async () => {
    if (creating || (!draft.trim() && !draftTitle.trim())) return
    setCreating(true)
    try {
      const id = await onCreateNote(draftTitle.trim() || 'Quick note', null, draft, {
        tags: ['quick-note']
      })
      if (!id) return
      setDraft('')
      setDraftTitle('')
      setQuickNoteOpen(false)
    } finally {
      setCreating(false)
    }
  }
  const createFromTemplate = async (template: NoteTemplate) => {
    if (creating) return
    setCreating(true)
    try {
      const id = await onCreateNote(template.title, null, template.content, {
        icon: template.icon,
        tags: template.tags
      })
      if (id) setTemplatesOpen(false)
    } finally {
      setCreating(false)
    }
  }
  const copy = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content || note.title)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy this page')
    }
  }

  const actions = (note: Note) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${note.title || 'Untitled'}`}
          className="shrink-0 text-muted-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => void onTogglePinned(note.id)}>
          {note.pinned ? 'Unpin page' : 'Pin page'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onDuplicate(note.id)}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void copy(note)}>Copy content</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => void onDelete(note.id)}
        >
          Delete page
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="page-enter min-w-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Your personal space</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Home</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick up where you left off, or start a new page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-9 px-3 text-sm"
              onClick={() => setQuickNoteOpen(true)}
            >
              Quick note
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 gap-2 bg-notes px-3 text-sm text-notes-foreground hover:bg-notes/90">
                  <Plus className="size-4" />
                  Create
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => void onCreateNote('Untitled page')}>
                  <FileText className="size-4" />
                  New page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void onNewBook()}>
                  <BookOpen className="size-4" />
                  New notebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                  <Sparkles className="size-4" />
                  Use a template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={importing} onClick={() => void onImport()}>
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Import a file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <section aria-labelledby="library-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="library-heading" className="text-base font-semibold">
              Your pages{' '}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{notes.length}</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTemplatesOpen(true)}
              className="gap-1.5 text-muted-foreground"
            >
              <Sparkles className="size-3.5" />
              Templates
            </Button>
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              aria-label="Search your pages"
              placeholder="Search your pages"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-notes/40"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Show pages">
              {(
                [
                  { id: 'all', label: 'All pages' },
                  { id: 'pinned', label: 'Pinned' },
                  { id: 'notebooks', label: 'Notebooks' }
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    filter === item.id
                      ? 'bg-notes/10 text-notes'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tags.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Filter by tag"
                      className="h-8 max-w-28 gap-2 text-xs"
                    >
                      <span className="truncate">{tag || 'All tags'}</span>
                      <ChevronDown className="size-3 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                    <DropdownMenuItem
                      aria-current={!tag ? 'true' : undefined}
                      onClick={() => setTag('')}
                    >
                      All tags
                    </DropdownMenuItem>
                    {tags.map((item) => (
                      <DropdownMenuItem
                        key={item}
                        aria-current={tag === item ? 'true' : undefined}
                        onClick={() => setTag(item)}
                      >
                        {item}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Sort pages"
                    className="h-8 gap-2 text-xs"
                  >
                    {sort === 'updated'
                      ? 'Last updated'
                      : sort === 'created'
                        ? 'Date created'
                        : 'Title A–Z'}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(
                    [
                      { id: 'updated', label: 'Last updated' },
                      { id: 'created', label: 'Date created' },
                      { id: 'title', label: 'Title A–Z' }
                    ] as const
                  ).map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      aria-current={sort === item.id ? 'true' : undefined}
                      onClick={() => setSort(item.id)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div
                className="flex gap-0.5 rounded-md border border-border p-0.5"
                role="group"
                aria-label="Page layout"
              >
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded',
                    view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <List className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded',
                    view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
              <FileText className="mx-auto mb-4 size-7 text-muted-foreground" />
              <h3 className="text-base font-medium">
                {notes.length ? 'No pages found' : 'A place for your next idea'}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {notes.length
                  ? 'Try a different search or clear your filters.'
                  : 'Write something down. You can organize it into a notebook later.'}
              </p>
              <Button
                variant={notes.length ? 'outline' : 'default'}
                className="mt-5"
                onClick={() => {
                  if (notes.length) {
                    setQuery('')
                    setFilter('all')
                    setTag('')
                  } else {
                    void onCreateNote('Untitled page')
                  }
                }}
              >
                {notes.length ? 'Clear filters' : 'Create your first page'}
              </Button>
            </div>
          ) : (
            <div
              className={
                view === 'grid'
                  ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'
                  : 'overflow-hidden rounded-xl border border-border bg-card divide-y divide-border'
              }
            >
              {filtered.map((note) => (
                <article
                  key={note.id}
                  className={cn(
                    'group relative flex min-w-0 transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
                    view === 'grid' && 'flex-col rounded-xl border border-border bg-card'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onOpenNote(note.id)}
                    className={cn(
                      'min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-notes/40',
                      view === 'grid'
                        ? 'rounded-xl p-5 pr-12'
                        : 'flex items-center gap-3 px-4 py-4 sm:gap-4'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
                        view === 'grid' && 'mb-4'
                      )}
                    >
                      <NoteGlyph
                        icon={note.icon}
                        isBook={parents.has(note.id)}
                        className="size-4"
                      />
                    </span>
                    <span className="block min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {note.title || 'Untitled page'}
                        </span>
                        {note.pinned && (
                          <Pin aria-label="Pinned" className="size-3 shrink-0 text-notes" />
                        )}
                      </span>
                      <span
                        className={cn(
                          'mt-1 block text-xs leading-relaxed text-muted-foreground',
                          view === 'grid' ? 'line-clamp-3 min-h-12' : 'truncate'
                        )}
                      >
                        {stripMarkdown(note.content) ||
                          (parents.has(note.id) ? 'Notebook' : 'Empty page')}
                      </span>
                      {(note.parentId || view === 'grid') && (
                        <span className="mt-3 block truncate text-xs text-muted-foreground">
                          {note.parentId ? titles.get(note.parentId) || 'Notebook' : 'Page'}
                          {view === 'grid' && ` · ${shortAge(note.updatedAt || note.createdAt)}`}
                        </span>
                      )}
                    </span>
                    {view === 'list' && (
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                        {shortAge(note.updatedAt || note.createdAt)}
                      </span>
                    )}
                  </button>
                  <div
                    className={
                      view === 'grid' ? 'absolute right-2 top-3' : 'flex shrink-0 items-center pr-2'
                    }
                  >
                    {actions(note)}
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            {filtered.length === notes.length
              ? sort === 'title'
                ? 'Pages sorted by title.'
                : sort === 'created'
                  ? 'Your newest pages appear first.'
                  : 'Your most recently updated pages appear first.'
              : `${filtered.length} ${filtered.length === 1 ? 'page' : 'pages'} shown`}
          </p>
        </section>
      </div>

      <Sheet open={quickNoteOpen} onOpenChange={setQuickNoteOpen}>
        <SheetContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick note</DialogTitle>
            <DialogDescription>
              Your draft stays on this device until you save it as a page.
            </DialogDescription>
          </DialogHeader>
          <input
            aria-label="Quick note title"
            placeholder="Title (optional)"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <textarea
            aria-label="Quick note text"
            placeholder="What would you like to remember?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={7}
            className="min-h-40 w-full flex-1 resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQuickNoteOpen(false)}>
              Keep draft
            </Button>
            <Button
              disabled={creating || (!draft.trim() && !draftTitle.trim())}
              onClick={() => void saveQuickNote()}
            >
              {creating ? 'Saving…' : 'Save as page'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <SheetContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start with a template</DialogTitle>
            <DialogDescription>
              Choose a starting point. Everything can be changed later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {NOTE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={creating}
                onClick={() => void createFromTemplate(template)}
                className="rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notes/40 disabled:opacity-50"
              >
                <span className="mb-2 block text-xl" aria-hidden>
                  {template.icon}
                </span>
                <span className="block text-sm font-medium">{template.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
