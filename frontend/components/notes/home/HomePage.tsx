import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckSquare,
  ChevronDown,
  Download,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Pin,
  Plus,
  Sparkles
} from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useNotesStore } from '../../../store/useNotesStore'
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

type LibraryFilter = 'all' | 'pinned' | 'notebooks' | 'templates'
type LibrarySort = 'updated' | 'created' | 'title'

interface StarterTemplateItem {
  icon: string
  title: string
  description: string
  templateId: string
}

const STARTER_TEMPLATES: StarterTemplateItem[] = [
  {
    icon: '📋',
    title: 'Meeting notes',
    description: 'Keep the agenda, discussion, decisions, and action items together.',
    templateId: 'meeting-notes'
  },
  {
    icon: '🚀',
    title: 'Project plan',
    description: 'Outline the problem, goals, milestones, and deliverables.',
    templateId: 'project-spec'
  },
  {
    icon: '☀️',
    title: 'Daily journal',
    description: 'Space for top priorities, flow of thoughts, and reflections.',
    templateId: 'daily-journal'
  },
  {
    icon: '💡',
    title: 'Idea sandbox',
    description: 'Capture a new concept, analyze pros and cons, and plan next steps.',
    templateId: 'brainstorming'
  }
]

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
  const [promptText, setPromptText] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>('all')
  const [sort, setSort] = useState<LibrarySort>('updated')
  const [tag, setTag] = useState('')
  const activeTab = useNotesStore((s) => s.activeHomeTab)
  const setActiveTab = useNotesStore((s) => s.setActiveHomeTab)
  const [view, setView] = useState<'list' | 'grid'>(() =>
    localStorage.getItem('mynotes:library-view') === 'grid' ? 'grid' : 'list'
  )
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null)
  const [templateCategory, setTemplateCategory] = useState<
    'all' | 'Productivity' | 'Project' | 'Engineering' | 'Personal'
  >('all')
  const [quickNoteOpen, setQuickNoteOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState(
    () => localStorage.getItem('mynotes:scratchpad-title') || ''
  )
  const [draft, setDraft] = useState(() => localStorage.getItem('mynotes:scratchpad-content') || '')
  const [creating, setCreating] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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
    const openTemplates = () => setActiveTab('templates')
    const openLibrary = () => setActiveTab('notes')
    window.addEventListener('notes:open-templates', openTemplates)
    window.addEventListener('notes:open-library', openLibrary)
    return () => {
      window.removeEventListener('notes:open-templates', openTemplates)
      window.removeEventListener('notes:open-library', openLibrary)
    }
  }, [setActiveTab])

  const parents = useMemo(
    () => new Set(notes.map((note) => note.parentId).filter(Boolean)),
    [notes]
  )
  const notebooks = useMemo(
    () => notes.filter((note) => parents.has(note.id)),
    [notes, parents]
  )
  const tags = useMemo(() => [...new Set(notes.flatMap((note) => note.tags ?? []))].sort(), [notes])
  const titles = useMemo(() => new Map(notes.map((note) => [note.id, note.title])), [notes])

  // Extract task list items from notes for the Tasks tab
  const taskItems = useMemo(() => {
    const items: Array<{ id: string; noteId: string; noteTitle: string; text: string; done: boolean }> = []
    for (const note of notes) {
      const lines = note.content.split('\n')
      lines.forEach((line, idx) => {
        const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
        if (match) {
          items.push({
            id: `${note.id}-${idx}`,
            noteId: note.id,
            noteTitle: note.title || 'Untitled',
            text: match[2],
            done: match[1].toLowerCase() === 'x'
          })
        }
      })
    }
    return items
  }, [notes])

  const filtered = useMemo(
    () =>
      notes
        .filter((note) => {
          const text = (query || promptText).trim().toLowerCase()
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
    [notes, query, promptText, filter, parents, tag, sort]
  )

  const filteredTemplates = useMemo(() => {
    const text = (query || promptText).trim().toLowerCase()
    return NOTE_TEMPLATES.filter((tmpl) => {
      const matchCategory =
        templateCategory === 'all' || tmpl.category === templateCategory
      const matchText =
        !text ||
        `${tmpl.title} ${tmpl.description} ${tmpl.tags.join(' ')}`
          .toLowerCase()
          .includes(text)
      return matchCategory && matchText
    })
  }, [templateCategory, query, promptText])

  const selectedNotebookName = useMemo(() => {
    if (!selectedNotebookId) return 'Personal Vault'
    const nb = notes.find((n) => n.id === selectedNotebookId)
    return nb ? nb.title || 'Notebook' : 'Personal Vault'
  }, [selectedNotebookId, notes])

  const handlePromptSubmit = async () => {
    const text = promptText.trim()
    if (!text || creating) return
    setCreating(true)
    try {
      const id = await onCreateNote(text, selectedNotebookId)
      if (id) {
        setPromptText('')
        onOpenNote(id)
      }
    } finally {
      setCreating(false)
    }
  }

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handlePromptSubmit()
    }
  }

  const handleSelectStarterTemplate = async (item: StarterTemplateItem) => {
    const tmpl = NOTE_TEMPLATES.find((t) => t.id === item.templateId)
    if (tmpl) {
      await createFromTemplate(tmpl)
    }
  }

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
      onOpenNote(id)
    } finally {
      setCreating(false)
    }
  }

  const createFromTemplate = async (template: NoteTemplate) => {
    if (creating) return
    setCreating(true)
    try {
      const id = await onCreateNote(template.title, selectedNotebookId, template.content, {
        icon: template.icon,
        tags: template.tags
      })
      if (id) {
        onOpenNote(id)
      }
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
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Desktop Greeting Header */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6 sm:pt-6 sm:pb-8 text-center select-none">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-foreground font-sans">
            What would you like to capture today?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a new note, search your library, or pick a structured template.
          </p>
        </div>

        {/* Floating Prompt / Note Creation Card */}
        <div className="notes-prompt-card relative w-full max-w-2xl mx-auto p-4 sm:p-5 mb-5">
          {/* Main Input Text Area */}
          <div className="relative min-h-[56px] flex items-start">
            <textarea
              ref={textareaRef}
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value)
                setQuery(e.target.value)
              }}
              onKeyDown={handlePromptKeyDown}
              placeholder={
                activeTab === 'templates'
                  ? 'Search templates or write a page title...'
                  : 'Write a title to start a page, or search your notes...'
              }
              rows={activeTab === 'scratchpad' ? 5 : Math.max(1, Math.min(4, promptText.split('\n').length))}
              className="w-full resize-none bg-transparent text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
            />
          </div>

          {/* Bottom Toolbar inside the prompt card */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            {/* Left Actions */}
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Add options"
                    className="flex size-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => void onCreateNote('Untitled page', selectedNotebookId)}>
                    <FileText className="size-4" />
                    New page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void onNewBook()}>
                    <BookOpen className="size-4" />
                    New notebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('templates')}>
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
                    Import file
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  activeTab === 'templates'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Templates</span>
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Vault / Notebook Selector Pill */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                  >
                    <span className="max-w-[120px] truncate">{selectedNotebookName}</span>
                    <ChevronDown className="size-3 opacity-60 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setSelectedNotebookId(null)}>
                    Personal Vault (Root)
                  </DropdownMenuItem>
                  {notebooks.length > 0 && <DropdownMenuSeparator />}
                  {notebooks.map((nb) => (
                    <DropdownMenuItem
                      key={nb.id}
                      onClick={() => setSelectedNotebookId(nb.id)}
                      className="gap-2"
                    >
                      <span>{nb.icon || '📁'}</span>
                      <span className="truncate">{nb.title || 'Untitled notebook'}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Submit / Create Blue Action Button */}
              <button
                type="button"
                onClick={() => void handlePromptSubmit()}
                disabled={!promptText.trim() || creating}
                aria-label="Create page"
                className={cn(
                  'flex size-8 items-center justify-center rounded-full transition-all',
                  promptText.trim()
                    ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs cursor-pointer'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                {creating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Segmented Pill Selector (Notes | Templates | Scratchpad | Tasks) */}
        <div className="flex justify-center mb-8 select-none">
          <div className="inline-flex items-center bg-muted/60 p-1 rounded-full border border-border/40 text-xs font-medium text-muted-foreground shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={cn(
                'px-4 py-1.5 rounded-full transition-all duration-150',
                activeTab === 'notes'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'hover:text-foreground'
              )}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={cn(
                'px-4 py-1.5 rounded-full transition-all duration-150',
                activeTab === 'templates'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'hover:text-foreground'
              )}
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scratchpad')}
              className={cn(
                'px-4 py-1.5 rounded-full transition-all duration-150',
                activeTab === 'scratchpad'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'hover:text-foreground'
              )}
            >
              Scratchpad
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={cn(
                'px-4 py-1.5 rounded-full transition-all duration-150',
                activeTab === 'tasks'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'hover:text-foreground'
              )}
            >
              Tasks
            </button>
          </div>
        </div>

        {/* Tab Content: Scratchpad View */}
        {activeTab === 'scratchpad' && (
          <div className="notes-prompt-card max-w-2xl mx-auto p-5 mb-10 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground tracking-tight">
                Quick Scratchpad (Auto-saved)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void saveQuickNote()}
                disabled={creating || (!draft.trim() && !draftTitle.trim())}
                className="h-7 text-xs rounded-full"
              >
                Save as page
              </Button>
            </div>
            <input
              aria-label="Scratchpad title"
              placeholder="Title (optional)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none pb-2 border-b border-border/40 mb-3"
            />
            <textarea
              aria-label="Scratchpad content"
              placeholder="Jot down quick thoughts, links, or snippets here..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
            />
          </div>
        )}

        {/* Tab Content: Tasks View */}
        {activeTab === 'tasks' && (
          <div className="notes-prompt-card max-w-2xl mx-auto p-5 mb-10 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground tracking-tight">
                Tasks across notes ({taskItems.length})
              </span>
            </div>
            {taskItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No checklist tasks found in your notes. Use `- [ ] Task item` in any note to track tasks here!
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {taskItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenNote(item.noteId)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer text-xs transition-colors"
                  >
                    <CheckSquare
                      className={cn(
                        'size-4 shrink-0',
                        item.done ? 'text-notes' : 'text-muted-foreground'
                      )}
                    />
                    <span className={cn('flex-1 truncate', item.done && 'line-through text-muted-foreground')}>
                      {item.text}
                    </span>
                    <span className="text-2xs text-muted-foreground/60 truncate max-w-[120px]">
                      {item.noteTitle}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick-Starter Note Templates */}
        {activeTab === 'notes' && !promptText && (
          <div className="max-w-xl mx-auto flex flex-col gap-1.5 mb-12">
            {STARTER_TEMPLATES.map((item) => (
              <button
                key={item.templateId}
                type="button"
                onClick={() => void handleSelectStarterTemplate(item)}
                className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl hover:bg-muted/60 text-left text-sm text-foreground/90 transition-colors group cursor-pointer"
              >
                <span className="text-xl shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate font-medium text-xs sm:text-sm text-foreground">
                    {item.title}
                  </span>
                  <span className="truncate text-2xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  Use template →
                </span>
              </button>
            ))}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="size-3 text-amber-500" />
                <span>Browse all {NOTE_TEMPLATES.length} templates →</span>
              </button>
            </div>
          </div>
        )}

        {/* Library Section (All Pages, Filters, Grid/List) */}
        {activeTab === 'notes' && (
          <section aria-labelledby="library-heading" className="pt-4 border-t border-border/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="library-heading" className="text-base font-semibold tracking-tight text-foreground">
                Your pages{' '}
                <span className="ml-1 text-sm font-normal text-muted-foreground">({notes.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('templates')}
                  className="gap-1.5 text-xs text-muted-foreground rounded-full"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  Templates
                </Button>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1" role="group" aria-label="Show pages">
                {(
                  [
                    { id: 'all', label: 'All pages' },
                    { id: 'pinned', label: 'Pinned' },
                    { id: 'notebooks', label: 'Notebooks' },
                    { id: 'templates', label: 'Templates' }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
                    onClick={() => {
                      if (item.id === 'templates') {
                        setActiveTab('templates')
                      } else {
                        setFilter(item.id)
                      }
                    }}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                      filter === item.id
                        ? 'bg-notes/10 text-notes'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

            {/* Right Controls: Tag Filter, Sort, View Layout */}
            <div className="flex flex-wrap items-center gap-2">
              {tags.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Filter by tag"
                      className="h-8 max-w-28 gap-2 text-xs rounded-full"
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
                        #{item}
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
                    className="h-8 gap-2 text-xs rounded-full"
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
                className="flex gap-0.5 rounded-full border border-border p-0.5 bg-card"
                role="group"
                aria-label="Page layout"
              >
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full transition-colors',
                    view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <List className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full transition-colors',
                    view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center bg-card/40">
              <FileText className="mx-auto mb-4 size-7 text-muted-foreground" />
              <h3 className="text-base font-medium">
                {notes.length ? 'No pages found' : 'A place for your next idea'}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {notes.length
                  ? 'Try a different search query or clear your filters.'
                  : 'Start writing something down in the prompt box above.'}
              </p>
              <Button
                variant={notes.length ? 'outline' : 'default'}
                className="mt-5 rounded-full"
                onClick={() => {
                  if (notes.length) {
                    setQuery('')
                    setPromptText('')
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
                  ? 'grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3'
                  : 'overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60 shadow-2xs'
              }
            >
              {filtered.map((note) => (
                <article
                  key={note.id}
                  className={cn(
                    'group relative flex min-w-0 transition-all hover:bg-muted/40 focus-within:bg-muted/40',
                    view === 'grid' && 'flex-col rounded-2xl border border-border/70 bg-card hover:border-border hover:shadow-xs'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onOpenNote(note.id)}
                    className={cn(
                      'min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-notes/40',
                      view === 'grid'
                        ? 'rounded-2xl p-5 pr-12'
                        : 'flex items-center gap-3.5 px-4 py-3.5 sm:gap-4'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground',
                        view === 'grid' && 'mb-3'
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
                        <span className="truncate text-sm font-medium text-foreground">
                          {note.title || 'Untitled page'}
                        </span>
                        {note.pinned && (
                          <Pin aria-label="Pinned" className="size-3 shrink-0 fill-notes text-notes" />
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
                        <span className="mt-3 block truncate text-2xs text-muted-foreground/70">
                          {note.parentId ? titles.get(note.parentId) || 'Notebook' : 'Page'}
                          {view === 'grid' && ` · ${shortAge(note.updatedAt || note.createdAt)}`}
                        </span>
                      )}
                    </span>
                    {view === 'list' && (
                      <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground/70 sm:block">
                        {shortAge(note.updatedAt || note.createdAt)}
                      </span>
                    )}
                  </button>
                  <div
                    className={
                      view === 'grid' ? 'absolute right-2.5 top-3.5' : 'flex shrink-0 items-center pr-2'
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
        )}

        {/* Templates Section (Same design & layout as Library) */}
        {activeTab === 'templates' && (
          <section
            aria-labelledby="templates-heading"
            className="pt-4 border-t border-border/40 animate-in fade-in duration-150"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="templates-heading"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Template Gallery{' '}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({filteredTemplates.length})
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('notes')}
                  className="gap-1.5 text-xs text-muted-foreground rounded-full"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to pages
                </Button>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {/* Category Filter Chips */}
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label="Filter templates by category"
              >
                {(
                  [
                    { id: 'all', label: 'All templates' },
                    { id: 'Productivity', label: 'Productivity' },
                    { id: 'Project', label: 'Project' },
                    { id: 'Personal', label: 'Personal' },
                    { id: 'Engineering', label: 'Engineering' }
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={templateCategory === cat.id}
                    onClick={() => setTemplateCategory(cat.id)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                      templateCategory === cat.id
                        ? 'bg-notes/10 text-notes'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* View Layout Toggle */}
              <div className="flex items-center gap-2">
                <div
                  className="flex gap-0.5 rounded-full border border-border p-0.5 bg-card"
                  role="group"
                  aria-label="Template layout"
                >
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={view === 'list'}
                    onClick={() => setView('list')}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full transition-colors',
                      view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <List className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={view === 'grid'}
                    onClick={() => setView('grid')}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full transition-colors',
                      view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <LayoutGrid className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center bg-card/40">
                <Sparkles className="mx-auto mb-4 size-7 text-amber-500" />
                <h3 className="text-base font-medium">No templates found</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Try a different search query or clear your category filter.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 rounded-full"
                  onClick={() => {
                    setTemplateCategory('all')
                    setQuery('')
                    setPromptText('')
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div
                className={
                  view === 'grid'
                    ? 'grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3'
                    : 'overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/60 shadow-2xs'
                }
              >
                {filteredTemplates.map((template) => (
                  <article
                    key={template.id}
                    className={cn(
                      'group relative flex min-w-0 transition-all hover:bg-muted/40 focus-within:bg-muted/40',
                      view === 'grid' &&
                        'flex-col rounded-2xl border border-border/70 bg-card hover:border-border hover:shadow-xs'
                    )}
                  >
                    <button
                      type="button"
                      disabled={creating}
                      onClick={() => void createFromTemplate(template)}
                      className={cn(
                        'min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-notes/40',
                        view === 'grid'
                          ? 'rounded-2xl p-5'
                          : 'flex items-center gap-3.5 px-4 py-3.5 sm:gap-4'
                      )}
                    >
                      {view === 'grid' ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-lg">
                              {template.icon}
                            </span>
                            <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-2xs font-medium text-muted-foreground">
                              {template.category}
                            </span>
                          </div>
                          <span className="block min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground group-hover:text-notes transition-colors">
                              {template.title}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground line-clamp-3 min-h-12">
                              {template.description}
                            </span>
                            <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/40">
                              <div className="flex flex-wrap gap-1">
                                {template.tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="rounded-md bg-muted/60 px-1.5 py-0.5 text-2xs text-muted-foreground/80"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs font-medium text-notes opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                                Use template →
                              </span>
                            </div>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-lg">
                            {template.icon}
                          </span>
                          <span className="block min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground group-hover:text-notes transition-colors">
                                {template.title}
                              </span>
                              <span className="rounded-full bg-muted/80 px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                                {template.category}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {template.description}
                            </span>
                          </span>
                          <div className="hidden sm:flex items-center gap-1 shrink-0 mr-2">
                            {template.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="rounded-md bg-muted/60 px-1.5 py-0.5 text-2xs text-muted-foreground/80"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-medium text-notes opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0">
                            Use template →
                          </span>
                        </>
                      )}
                    </button>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              {filteredTemplates.length === NOTE_TEMPLATES.length
                ? 'Select any template to start a structured page.'
                : `${filteredTemplates.length} ${filteredTemplates.length === 1 ? 'template' : 'templates'} shown`}
            </p>
          </section>
        )}
      </div>

      {/* Quick note draft sheet */}
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
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <textarea
            aria-label="Quick note text"
            placeholder="What would you like to remember?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={7}
            className="min-h-40 w-full flex-1 resize-none rounded-xl border border-border bg-background p-3 text-sm leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setQuickNoteOpen(false)}>
              Keep draft
            </Button>
            <Button
              className="rounded-full"
              disabled={creating || (!draft.trim() && !draftTitle.trim())}
              onClick={() => void saveQuickNote()}
            >
              {creating ? 'Saving…' : 'Save as page'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
