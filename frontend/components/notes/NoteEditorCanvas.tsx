import type { Editor } from '@tiptap/react'
import { Briefcase } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Note } from '../../types/notes'
import { toast } from '../ui/toast'
import { cn } from '../ui/utils'
import { BacklinksPanel } from './backlinks/BacklinksPanel'
import { BookSubPagesGrid } from './editor/BookSubPagesGrid'
import { Breadcrumbs } from './editor/Breadcrumbs'
import { CoverAndIcon, CoverBanner } from './editor/CoverAndIcon'
import { DocumentHeader } from './editor/DocumentHeader'
import { FindReplaceBar } from './editor/FindReplaceBar'
import { DocumentOutline } from './editor/DocumentOutline'
import { NotesEditor } from './editor/NotesEditor'
import { NoteTagsBar } from './editor/NoteTagsBar'
import { OPEN_FIND_REPLACE_EVENT } from './editor/searchHighlight'
import { TitleInput } from './editor/TitleInput'
import { NoteAttachmentsPanel } from './NoteAttachmentsPanel'

import { getAncestors } from '../../store/useNotesStore'
import { DialogDescription, DialogTitle } from '../ui/dialog'
import { Sheet, SheetContent } from '../ui/sheet'
import { useMediaQuery } from '../ui/useMediaQuery'
import { useTheme } from '../../context/ThemeContext'
function toMarkdownDocument(title: string, content: string): string {
  const startsWithH1 = /^\s*#\s/.test(content)
  return title && !startsWithH1 ? `# ${title}\n\n${content}` : content
}

const OUTLINE_OPEN_KEY = 'mynotes:outline-open'

function readOutlineOpen(): boolean {
  return (
    localStorage.getItem(OUTLINE_OPEN_KEY) !== '0' &&
    window.matchMedia('(min-width: 1280px)').matches
  )
}

interface NoteEditorCanvasProps {
  note: Note
  notes: Note[]
  setSelectedNoteId: (id: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => Promise<boolean>
  deleteNote: (id: string) => Promise<void>
  toggleNotePinned: (id: string) => Promise<void>
  duplicateNote: (id: string) => Promise<string | null>
  createChildPage: (parentId: string) => Promise<string>
  getBacklinks: (
    noteId: string
  ) => Promise<Array<{ id: string; title: string; icon: string | null; parentId: string | null }>>
}

export const NoteEditorCanvas: React.FC<NoteEditorCanvasProps> = ({
  note,
  notes,
  setSelectedNoteId,
  updateNote,
  deleteNote,
  toggleNotePinned,
  duplicateNote,
  createChildPage,
  getBacklinks
}) => {
  const { fontClass } = useTheme()
  const compactOutline = useMediaQuery('(max-width: 1279px)')
  const ancestors = useMemo(() => getAncestors(notes, note.id), [notes, note.id])
  const childNotes = useMemo(() => notes.filter((n) => n.parentId === note.id), [notes, note.id])
  const isBook = childNotes.length > 0
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

  const [editor, setEditor] = useState<Editor | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(readOutlineOpen)
  useEffect(() => {
    localStorage.setItem(OUTLINE_OPEN_KEY, outlineOpen ? '1' : '0')
  }, [outlineOpen])

  const pendingSaveRef = useRef<{ id: string; title: string; content: string } | null>(null)
  const updateNoteRef = useRef(updateNote)
  useEffect(() => {
    updateNoteRef.current = updateNote
  }, [updateNote])

  const saveRevisionRef = useRef(0)
  const saveInFlightRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (saveInFlightRef.current) return false
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveInFlightRef.current = true
    let success = true
    try {
      while (pendingSaveRef.current) {
        const pending = pendingSaveRef.current
        const revision = saveRevisionRef.current
        success = await updateNoteRef.current(pending.id, {
          title: pending.title,
          content: pending.content
        })
        if (!success) {
          setSaveStatus('error')
          return false
        }
        if (revision === saveRevisionRef.current) pendingSaveRef.current = null
      }
      setSaveStatus('saved')
      return success
    } finally {
      saveInFlightRef.current = false
    }
  }, [])

  useEffect(
    () => () => {
      void flushPendingSave()
    },
    [flushPendingSave]
  )

  useEffect(() => {
    if (pendingSaveRef.current === null && !saveInFlightRef.current) {
      setTitle(note.title)
      setContent(note.content)
    }
  }, [note.title, note.content])

  const scheduleSave = useCallback(
    (nextTitle: string, nextContent: string): void => {
      saveRevisionRef.current += 1
      pendingSaveRef.current = { id: note.id, title: nextTitle, content: nextContent }
      setSaveStatus('saving')
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void flushPendingSave()
      }, 800)
    },
    [note.id, flushPendingSave]
  )

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    },
    []
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        void flushPendingSave().then((saved) => {
          if (saved) toast.success('Changes saved')
        })
      } else if (key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent(OPEN_FIND_REPLACE_EVENT))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flushPendingSave])

  const [wordCount, setWordCount] = useState(0)
  useEffect(() => {
    if (!editor) return
    const updateCount = (): void => {
      const storage = editor.storage as unknown as { characterCount?: { words: () => number } }
      setWordCount(storage.characterCount?.words() ?? 0)
    }
    updateCount()
    editor.on('transaction', updateCount)
    return () => {
      editor.off('transaction', updateCount)
    }
  }, [editor])

  const readingTime = useMemo(
    () => (wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 200))),
    [wordCount]
  )

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value)
      scheduleSave(value, pendingSaveRef.current?.content ?? content)
    },
    [content, scheduleSave]
  )

  const handleEditorChange = useCallback(
    (markdown: string) => {
      setContent(markdown)
      scheduleSave(pendingSaveRef.current?.title ?? title, markdown)
    },
    [title, scheduleSave]
  )

  const handleExport = useCallback(() => {
    const safeTitle = (title || 'Untitled Note').replace(/[\\/:*?"<>|]/g, '_').slice(0, 100)
    const blob = new Blob([toMarkdownDocument(title, content)], {
      type: 'text/markdown;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeTitle}.md`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    toast.success('Note exported', { description: `${safeTitle}.md` })
  }, [title, content])

  const handleCopyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(toMarkdownDocument(title, content)).then(
      () => toast.success('Copied as Markdown'),
      () => toast.error('Could not copy to clipboard')
    )
  }, [title, content])

  const handleDelete = useCallback(() => {
    void deleteNote(note.id)
  }, [note.id, deleteNote])

  return (
    <div className="flex min-w-0 flex-1 select-text flex-col overflow-hidden bg-background">
      <DocumentHeader
        saveStatus={saveStatus}
        isBook={isBook}
        subPageCount={childNotes.length}
        hasContent={wordCount > 0}
        focusMode={focusMode}
        outlineOpen={outlineOpen}
        pinned={!!note.pinned}
        fullWidth={!!note.fullWidth}
        editor={editor}
        onToggleFocus={() => setFocusMode((f) => !f)}
        onToggleOutline={() => setOutlineOpen((o) => !o)}
        onToggleFullWidth={() => void updateNote(note.id, { fullWidth: !note.fullWidth })}
        onTogglePinned={() => void toggleNotePinned(note.id)}
        onDuplicate={() => void duplicateNote(note.id)}
        onCopyMarkdown={handleCopyMarkdown}
        onExport={handleExport}
        onDelete={handleDelete}
      />

      <FindReplaceBar editor={editor} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'relative min-w-0 flex-1 overflow-y-auto transition-colors duration-500',
            focusMode && 'mydesk-focus'
          )}
        >
          <CoverBanner note={note} onUpdate={(u) => updateNote(note.id, u)} />

          <div
            className={cn(
              'relative z-10 mx-auto w-full px-5 py-6 pb-20 sm:px-8 lg:px-12',
              note.fullWidth ? 'max-w-none' : 'max-w-3xl'
            )}
          >
            <div className="group/page">
              <CoverAndIcon note={note} onUpdate={(u) => updateNote(note.id, u)} />

              <Breadcrumbs
                ancestors={ancestors}
                currentTitle={title}
                currentIcon={note.icon}
                onNavigate={setSelectedNoteId}
                onNavigateHome={() => setSelectedNoteId(null)}
              />

              <TitleInput value={title} onChange={handleTitleChange} />

              <div className="mt-3 mb-8 flex flex-wrap items-center gap-2 border-b border-border/40 pb-5 text-2xs font-medium text-muted-foreground select-none">
                {wordCount === 0 ? (
                  <span className="italic text-muted-foreground/60">
                    Start writing, or type / to add a block
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    <span className="size-1 rounded-full bg-muted-foreground/30" />
                    {readingTime} min read
                  </span>
                )}
                {note.caseNumber && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-notes/25 bg-notes/10 px-1.5 py-0.5 font-semibold text-notes select-all">
                    <Briefcase className="size-3" />
                    Case #{note.caseNumber}
                  </span>
                )}
                <span className="mx-0.5 h-3 w-px bg-border/60" />
                <NoteTagsBar
                  tags={note.tags ?? []}
                  onChange={(tags) => updateNote(note.id, { tags })}
                />
              </div>
            </div>

            <NotesEditor
              content={content}
              noteId={note.id}
              fontClass={fontClass}
              onEditorReady={setEditor}
              onChange={handleEditorChange}
            />

            {isBook && (
              <BookSubPagesGrid
                bookTitle={title}
                bookId={note.id}
                childNotes={childNotes}
                onSelectNote={setSelectedNoteId}
                onCreateChild={createChildPage}
              />
            )}

            <NoteAttachmentsPanel noteId={note.id} />

            <BacklinksPanel
              noteId={note.id}
              onNavigate={setSelectedNoteId}
              getBacklinks={getBacklinks}
            />
          </div>
        </div>

        {!compactOutline && (
          <aside
            aria-label="Page outline"
            aria-hidden={!outlineOpen || focusMode}
            inert={!outlineOpen || focusMode}
            className="edge-dock h-full shrink-0 overflow-hidden bg-background"
            style={{ width: outlineOpen && !focusMode ? 224 : 0 }}
          >
            <div
              className="edge-dock-content h-full w-56 overflow-y-auto border-l border-border"
              style={{
                transform: outlineOpen && !focusMode ? 'translateX(0)' : 'translateX(100%)'
              }}
            >
              {editor && <DocumentOutline editor={editor} onClose={() => setOutlineOpen(false)} />}
            </div>
          </aside>
        )}
      </div>
      {compactOutline && (
        <Sheet open={outlineOpen && !focusMode} onOpenChange={setOutlineOpen}>
          <SheetContent className="w-[min(320px,90vw)] max-w-none p-4 [&>button]:hidden">
            <DialogTitle className="sr-only">Page outline</DialogTitle>
            <DialogDescription className="sr-only">
              Jump to a heading in this page.
            </DialogDescription>
            {editor && (
              <DocumentOutline
                editor={editor}
                onClose={() => setOutlineOpen(false)}
                onNavigate={() => setOutlineOpen(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
