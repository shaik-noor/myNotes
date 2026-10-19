import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Hash,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  X,
  Zap
} from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { Note } from '../../../types/notes'
import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../ui/dropdown-menu'
import { toast } from '../../ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { cn } from '../../ui/utils'
import { NoteGlyph } from '../noteIcon'
import { shortAge } from '../sidebar/NotesSidebarPanel'
import { NOTE_TEMPLATES, type NoteTemplate } from './noteTemplates'

export function stripMarkdown(content?: string): string {
  if (!content) return ''
  return content
    .replace(/^#+\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/>\s+/g, '')
    .replace(/- \[[ xX]\] /g, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function getGreeting(): string {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 18) return 'Good afternoon'
  return 'Good evening'
}

type ExplorerTab = 'all' | 'recent' | 'pinned' | 'books'
type ViewMode = 'grid' | 'table'
type SortMode = 'updated' | 'created' | 'title'

const SCRATCHPAD_KEY = 'mynotes:scratchpad-content'
const SCRATCHPAD_TITLE_KEY = 'mynotes:scratchpad-title'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ExplorerTab>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [showScratchpad, setShowScratchpad] = useState(false)
  const [scratchTitle, setScratchTitle] = useState(
    () => localStorage.getItem(SCRATCHPAD_TITLE_KEY) || ''
  )
  const [scratchContent, setScratchContent] = useState(
    () => localStorage.getItem(SCRATCHPAD_KEY) || ''
  )

  // Persist scratchpad
  useEffect(() => {
    localStorage.setItem(SCRATCHPAD_TITLE_KEY, scratchTitle)
  }, [scratchTitle])

  useEffect(() => {
    localStorage.setItem(SCRATCHPAD_KEY, scratchContent)
  }, [scratchContent])

  const greeting = useMemo(() => getGreeting(), [])
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  // Derived sets
  const parentIds = useMemo(
    () => new Set(notes.map((n) => n.parentId).filter(Boolean) as string[]),
    [notes]
  )
  const booksCount = useMemo(
    () => notes.filter((n) => parentIds.has(n.id)).length,
    [notes, parentIds]
  )
  const pinnedNotes = useMemo(() => notes.filter((n) => !!n.pinned), [notes])
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of notes) {
      if (n.parentId) {
        map.set(n.parentId, (map.get(n.parentId) || 0) + 1)
      }
    }
    return map
  }, [notes])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of notes) {
      for (const t of n.tags ?? []) {
        counts.set(t, (counts.get(t) || 0) + 1)
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [notes])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let result = [...notes]

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      )
    }

    // Active tab
    if (activeTab === 'recent') {
      // Top recent 20
      result = result.sort((a, b) =>
        (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
      )
    } else if (activeTab === 'pinned') {
      result = result.filter((n) => !!n.pinned)
    } else if (activeTab === 'books') {
      result = result.filter((n) => parentIds.has(n.id))
    }

    // Active Tag
    if (selectedTag) {
      result = result.filter((n) => (n.tags ?? []).includes(selectedTag))
    }

    // Sorting
    result.sort((a, b) => {
      if (sortMode === 'title') {
        return (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
      }
      if (sortMode === 'created') {
        return (b.createdAt || '').localeCompare(a.createdAt || '')
      }
      // default: updated
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
    })

    return result
  }, [notes, searchQuery, activeTab, selectedTag, sortMode, parentIds])

  // Scratchpad handler
  const handleSaveScratchpad = async (): Promise<void> => {
    if (!scratchContent.trim() && !scratchTitle.trim()) {
      toast.info('Scratchpad is empty')
      return
    }
    const finalTitle = scratchTitle.trim() || 'Quick Note'
    await onCreateNote(finalTitle, null, scratchContent, {
      icon: '⚡',
      tags: ['quick-note']
    })
    setScratchTitle('')
    setScratchContent('')
    setShowScratchpad(false)
    toast.success('Note saved from scratchpad')
  }

  // Template handler
  const handleUseTemplate = async (template: NoteTemplate): Promise<void> => {
    await onCreateNote(template.title, null, template.content, {
      icon: template.icon,
      tags: template.tags
    })
    toast.success(`Created page from ${template.title}`)
  }

  const handleCopyNote = (note: Note): void => {
    navigator.clipboard.writeText(note.content || note.title)
    toast.success('Content copied to clipboard')
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background/50 selection:bg-notes/20">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed -top-32 left-1/4 -z-10 size-[550px] rounded-full bg-notes/10 blur-[130px] opacity-70" />
      <div className="pointer-events-none fixed top-1/2 right-10 -z-10 size-[450px] rounded-full bg-sf/8 blur-[130px] opacity-60" />

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 lg:px-12 space-y-9 pb-24">
        {/* Top Hero Section */}
        <section className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-7">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-2xs font-medium text-muted-foreground backdrop-blur-md">
              <Calendar className="size-3 text-notes" />
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {greeting}, <span className="text-notes">Shaik</span> 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Welcome back to your personal workspace. Capture ideas, organize runbooks, and manage
              documentation effortlessly.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void onCreateNote('Untitled Page')}
              className="h-8 gap-1.5 rounded-lg bg-notes text-notes-foreground shadow-sm hover:bg-notes/90 font-semibold"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              New Page
            </Button>

            <Button
              variant="outline"
              onClick={() => void onNewBook()}
              className="h-8 gap-1.5 rounded-lg border-border/70 hover:bg-muted text-xs"
            >
              <BookOpen className="size-3.5 text-notes" />
              New Book
            </Button>

            <Button
              variant={showScratchpad ? 'secondary' : 'outline'}
              onClick={() => setShowScratchpad((v) => !v)}
              className="h-8 gap-1.5 rounded-lg border-border/70 hover:bg-muted text-xs"
            >
              <Zap
                className={cn(
                  'size-3.5',
                  showScratchpad ? 'text-amber-500 fill-amber-500/20' : 'text-amber-500'
                )}
              />
              Quick Jot
            </Button>

            <Button
              variant="outline"
              onClick={() => void onImport()}
              disabled={importing}
              className="h-8 gap-1.5 rounded-lg border-border/70 hover:bg-muted text-xs"
            >
              {importing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Import
            </Button>
          </div>
        </section>

        {/* Scratchpad Collapsible Drawer */}
        <AnimatePresence>
          {showScratchpad && (
            <motion.section
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-amber-500/30 bg-card/80 p-5 shadow-lg backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                      <Zap className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">Rapid Scratchpad</h3>
                      <p className="text-2xs text-muted-foreground">
                        Type thoughts quickly — auto-saved locally until saved as a note.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setScratchTitle('')
                        setScratchContent('')
                      }}
                      className="text-muted-foreground hover:text-foreground text-2xs"
                    >
                      Clear
                    </Button>
                    <Button
                      size="xs"
                      onClick={() => void handleSaveScratchpad()}
                      className="bg-notes text-notes-foreground hover:bg-notes/90 text-2xs font-semibold"
                    >
                      Save as Note
                    </Button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Note Title (Optional)..."
                  value={scratchTitle}
                  onChange={(e) => setScratchTitle(e.target.value)}
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />

                <textarea
                  placeholder="What's on your mind? Jot down meeting notes, code snippets, or todo items..."
                  value={scratchContent}
                  onChange={(e) => setScratchContent(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border/60 bg-background/80 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500/50 font-sans"
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Metric Cards Row */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div
            onClick={() => {
              setActiveTab('all')
              setSelectedTag(null)
            }}
            className={cn(
              'group cursor-pointer rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md',
              activeTab === 'all' && !selectedTag
                ? 'border-notes/40 bg-notes/8 shadow-sm ring-1 ring-notes/20'
                : 'border-border/50 bg-card/60 hover:border-border/80 hover:bg-card/90'
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-2xs font-bold uppercase tracking-wider">Total Pages</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-notes/10 text-notes">
                <FileText className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {notes.length}
              </span>
              <span className="text-2xs text-muted-foreground">in workspace</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('books')
              setSelectedTag(null)
            }}
            className={cn(
              'group cursor-pointer rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md',
              activeTab === 'books'
                ? 'border-notes/40 bg-notes/8 shadow-sm ring-1 ring-notes/20'
                : 'border-border/50 bg-card/60 hover:border-border/80 hover:bg-card/90'
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-2xs font-bold uppercase tracking-wider">Notebooks</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <BookOpen className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {booksCount}
              </span>
              <span className="text-2xs text-muted-foreground">with sub-pages</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('pinned')
              setSelectedTag(null)
            }}
            className={cn(
              'group cursor-pointer rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md',
              activeTab === 'pinned'
                ? 'border-notes/40 bg-notes/8 shadow-sm ring-1 ring-notes/20'
                : 'border-border/50 bg-card/60 hover:border-border/80 hover:bg-card/90'
            )}
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-2xs font-bold uppercase tracking-wider">Pinned</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Pin className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {pinnedNotes.length}
              </span>
              <span className="text-2xs text-muted-foreground">favorites</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab('all')
              if (allTags.length > 0) setSelectedTag(allTags[0][0])
            }}
            className="group cursor-pointer rounded-2xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:border-border/80 hover:bg-card/90 backdrop-blur-md"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-2xs font-bold uppercase tracking-wider">Tags</span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <Hash className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {allTags.length}
              </span>
              <span className="text-2xs text-muted-foreground">topics labeled</span>
            </div>
          </div>
        </section>

        {/* 1-Click Starter Templates Shelf */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-notes" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                Starter Templates
              </h2>
              <span className="text-2xs text-muted-foreground hidden sm:inline">
                • Jumpstart documentation in one click
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NOTE_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => void handleUseTemplate(tmpl)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-notes/40 hover:bg-card/90 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-xl shadow-2xs group-hover:scale-110 transition-transform">
                    {tmpl.icon}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="truncate text-xs font-bold text-foreground group-hover:text-notes transition-colors">
                        {tmpl.title}
                      </h4>
                      <span className="shrink-0 rounded-full bg-muted/70 px-1.5 py-0.5 text-3xs font-medium text-muted-foreground uppercase tracking-wider">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-2xs leading-relaxed text-muted-foreground">
                      {tmpl.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                  <div className="flex items-center gap-1">
                    {tmpl.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-muted/50 px-1.5 py-0.5 text-3xs text-muted-foreground/80"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-2xs font-semibold text-notes opacity-0 group-hover:opacity-100 transition-opacity">
                    Use template →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pinned / Favorites Shelf (if any) */}
        {pinnedNotes.length > 0 && (
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="size-4 text-amber-500 fill-amber-500/20" />
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Pinned Favorites
                </h2>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-500 tabular-nums">
                  {pinnedNotes.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note.id)}
                  className="group relative cursor-pointer rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-card/90 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <NoteGlyph
                        icon={note.icon}
                        isBook={parentIds.has(note.id)}
                        className="size-4"
                      />
                      <h4 className="truncate text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                        {note.title || 'Untitled'}
                      </h4>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void onTogglePinned(note.id)
                          }}
                          className="text-amber-500 hover:text-muted-foreground p-1 rounded-md"
                        >
                          <PinOff className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Unpin page</TooltipContent>
                    </Tooltip>
                  </div>

                  <p className="mt-2 line-clamp-2 text-2xs leading-relaxed text-muted-foreground">
                    {stripMarkdown(note.content) || (
                      <span className="italic text-muted-foreground/60">No additional text</span>
                    )}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-3xs text-muted-foreground/80 border-t border-border/40 pt-2">
                    <div className="flex items-center gap-1">
                      {(note.tags ?? []).slice(0, 2).map((t) => (
                        <span key={t} className="rounded bg-muted/60 px-1.5 py-0.5">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span className="tabular-nums">
                      {shortAge(note.updatedAt || note.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Workspace Explorer Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'All Pages', count: notes.length },
                  { id: 'recent', label: 'Recently Edited', count: Math.min(20, notes.length) },
                  { id: 'pinned', label: 'Pinned', count: pinnedNotes.length },
                  { id: 'books', label: 'Notebooks', count: booksCount }
                ] as const
              ).map((tab) => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id)
                      setSelectedTag(null)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                      active
                        ? 'bg-notes text-notes-foreground shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        'text-2xs tabular-nums',
                        active ? 'opacity-80' : 'text-muted-foreground/60'
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Controls: Search, Sort & View Mode */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search box */}
              <div className="relative w-44 sm:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border/60 bg-background/80 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-notes/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs border-border/60"
                  >
                    <Filter className="size-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">
                      {sortMode === 'updated'
                        ? 'Recently Updated'
                        : sortMode === 'created'
                          ? 'Recently Created'
                          : 'Title A-Z'}
                    </span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setSortMode('updated')}>
                    Recently Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode('created')}>
                    Recently Created
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortMode('title')}>
                    Title (A-Z)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors cursor-pointer',
                    viewMode === 'grid'
                      ? 'bg-background text-notes shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-md transition-colors cursor-pointer',
                    viewMode === 'table'
                      ? 'bg-background text-notes shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="List view"
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tags Chips Bar (if any) */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                Filter by tag:
              </span>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-2xs font-semibold text-destructive hover:bg-destructive/25 transition-colors cursor-pointer"
                >
                  <X className="size-2.5" />
                  Clear filter
                </button>
              )}
              {allTags.map(([tag, count]) => {
                const active = selectedTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag((cur) => (cur === tag ? null : tag))}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-2xs font-medium transition-all cursor-pointer',
                      active
                        ? 'border-notes/40 bg-notes/15 text-notes font-semibold'
                        : 'border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:text-foreground'
                    )}
                  >
                    <Hash className="size-2.5 opacity-60" />
                    <span>{tag}</span>
                    <span className="text-3xs opacity-60 tabular-nums">({count})</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty state within explorer */}
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 py-16 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                <NotebookPen className="size-6" />
              </span>
              <h3 className="text-sm font-bold text-foreground">
                {searchQuery || selectedTag ? 'No matching pages found' : 'No pages in this view'}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {searchQuery || selectedTag
                  ? 'Try searching with different keywords or clear active tag filters.'
                  : 'Get started by creating a new document or pick a starter template above.'}
              </p>
              {(searchQuery || selectedTag) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTag(null)
                  }}
                  className="mt-4 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredNotes.map((note) => {
                const isBook = parentIds.has(note.id)
                const subPages = childCountMap.get(note.id) || 0
                const excerpt = stripMarkdown(note.content)

                return (
                  <div
                    key={note.id}
                    onClick={() => onOpenNote(note.id)}
                    className="group relative flex flex-col justify-between rounded-xl border border-border/50 bg-card/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-notes/40 hover:bg-card/95 hover:shadow-md cursor-pointer"
                  >
                    <div>
                      {/* Top Row: Icon + Title + Action Menu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <NoteGlyph icon={note.icon} isBook={isBook} className="size-4 shrink-0" />
                          <h4 className="truncate text-xs font-bold text-foreground group-hover:text-notes transition-colors">
                            {note.title || 'Untitled'}
                          </h4>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {note.pinned && (
                            <span className="text-amber-500" title="Pinned">
                              <Pin className="size-3.5 fill-amber-500/20" />
                            </span>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => onOpenNote(note.id)}>
                                Open page
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void onTogglePinned(note.id)}>
                                {note.pinned ? 'Unpin from favorites' : 'Pin to favorites'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyNote(note)}>
                                Copy content
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void onDuplicate(note.id)}>
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => void onDelete(note.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete page
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Excerpt */}
                      <p className="mt-2.5 line-clamp-3 text-2xs leading-relaxed text-muted-foreground/90 font-sans">
                        {excerpt || (
                          <span className="italic text-muted-foreground/50">Empty page</span>
                        )}
                      </p>
                    </div>

                    {/* Footer: Tags, subpages & time */}
                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2.5 text-3xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {isBook && (
                          <span className="inline-flex items-center gap-1 rounded bg-notes/10 px-1.5 py-0.5 text-notes font-semibold">
                            <BookOpen className="size-2.5" />
                            {subPages} sub-page{subPages === 1 ? '' : 's'}
                          </span>
                        )}
                        {(note.tags ?? []).slice(0, 2).map((t) => (
                          <span key={t} className="rounded bg-muted/60 px-1.5 py-0.5">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <span className="shrink-0 tabular-nums font-mono text-muted-foreground/70">
                        {shortAge(note.updatedAt || note.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Table / List View */
            <div className="rounded-xl border border-border/50 bg-card/60 overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-2xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 bg-muted/30">
                <div className="col-span-6 sm:col-span-5">Page Title</div>
                <div className="hidden sm:block col-span-3">Tags & Notebook</div>
                <div className="col-span-4 sm:col-span-3">Last Modified</div>
                <div className="col-span-2 sm:col-span-1 text-right">Actions</div>
              </div>

              <div className="divide-y divide-border/30">
                {filteredNotes.map((note) => {
                  const isBook = parentIds.has(note.id)
                  const subPages = childCountMap.get(note.id) || 0

                  return (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote(note.id)}
                      className="group grid grid-cols-12 items-center gap-3 px-4 py-2.5 text-xs transition-colors hover:bg-muted/40 cursor-pointer"
                    >
                      {/* Title & Glyph */}
                      <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                        <NoteGlyph icon={note.icon} isBook={isBook} className="size-3.5 shrink-0" />
                        <span className="truncate font-semibold text-foreground group-hover:text-notes transition-colors">
                          {note.title || 'Untitled'}
                        </span>
                        {note.pinned && (
                          <Pin className="size-3 text-amber-500 fill-amber-500/20 shrink-0" />
                        )}
                      </div>

                      {/* Tags & Notebook */}
                      <div className="hidden sm:flex col-span-3 items-center gap-1 overflow-hidden">
                        {isBook && (
                          <span className="rounded bg-notes/10 px-1.5 py-0.5 text-3xs font-medium text-notes">
                            {subPages} pages
                          </span>
                        )}
                        {(note.tags ?? []).slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded bg-muted/60 px-1.5 py-0.5 text-3xs text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Last Modified */}
                      <div className="col-span-4 sm:col-span-3 text-2xs text-muted-foreground tabular-nums">
                        {new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>

                      {/* Actions */}
                      <div
                        className="col-span-2 sm:col-span-1 flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onOpenNote(note.id)}>
                              Open page
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void onTogglePinned(note.id)}>
                              {note.pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void onDuplicate(note.id)}>
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => void onDelete(note.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              Delete page
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
