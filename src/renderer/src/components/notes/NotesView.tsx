import { type Editor, useEditorState } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAncestors, useNotesStore } from '../../store/useNotesStore'
import { DEFAULT_CHAT_MODEL, type Note } from '../../types/notes'
import { confirmDialog } from '../ui/confirm'
import { duration, ease, prefersReducedMotion } from '../ui/motion'
import { toast } from '../ui/toast'
import { cn } from '../ui/utils'
import { AiInlineToolbar } from './ai/AiInlineToolbar'
import { useAiInline } from './ai/useAiInline'
import { BacklinksPanel } from './backlinks/BacklinksPanel'
import { BookSubPagesGrid } from './editor/BookSubPagesGrid'
import { Breadcrumbs } from './editor/Breadcrumbs'
import { CoverAndIcon, CoverBanner } from './editor/CoverAndIcon'
import { DocumentHeader } from './editor/DocumentHeader'
import { DocumentOutline } from './editor/DocumentOutline'
import { OPEN_PAGE_PEEK_EVENT } from './editor/editorProps'
import { NotesEditor } from './editor/NotesEditor'
import { NoteTagsBar } from './editor/NoteTagsBar'
import { OPEN_FIND_REPLACE_EVENT } from './editor/searchHighlight'
import { TitleInput } from './editor/TitleInput'
import { HomePage } from './home/HomePage'
import { NoteAttachmentsPanel } from './NoteAttachmentsPanel'
import { NotePeekPanel } from './peek/NotePeekPanel'
import { useNoteCreation } from './sidebar/NotesSidebarPanel'

function toMarkdownDocument(title: string, content: string): string {
  const startsWithH1 = /^\s*#\s/.test(content)
  return title && !startsWithH1 ? `# ${title}\n\n${content}` : content
}

const OUTLINE_OPEN_KEY = 'mynotes:outline-open'

function readOutlineOpen(): boolean {
  return localStorage.getItem(OUTLINE_OPEN_KEY) !== '0'
}

interface NoteEditorCanvasProps {
  note: Note
  notes: Note[]
  setSelectedNoteId: (id: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  toggleNotePinned: (id: string) => Promise<void>
  duplicateNote: (id: string) => Promise<string | null>
  createChildPage: (parentId: string) => Promise<string>
  getBacklinks: (
    noteId: string
  ) => Promise<Array<{ id: string; title: string; icon: string | null; parentId: string | null }>>
}

const NoteEditorCanvas: React.FC<NoteEditorCanvasProps> = ({
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
  const ancestors = useMemo(() => getAncestors(notes, note.id), [notes, note.id])
  const childNotes = useMemo(() => notes.filter((n) => n.parentId === note.id), [notes, note.id])
  const isBook = childNotes.length > 0
  const isSubPage = !!note.parentId
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')

  const [editor, setEditor] = useState<Editor | null>(null)
  const ai = useAiInline(DEFAULT_CHAT_MODEL)
  const { rewrite } = ai
  const handleRewrite = useCallback((ed: Editor) => void rewrite(ed), [rewrite])
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

  const flushPendingSave = useCallback((): void => {
    const pending = pendingSaveRef.current
    if (!pending) return
    pendingSaveRef.current = null
    void updateNoteRef.current(pending.id, { title: pending.title, content: pending.content })
  }, [])

  useEffect(() => {
    return () => flushPendingSave()
  }, [flushPendingSave])

  useEffect(() => {
    if (pendingSaveRef.current === null) {
      if (note.title !== title) setTitle(note.title)
      if (note.content !== content) setContent(note.content)
    }
  }, [note.title, note.content])

  useEffect(() => {
    if (title === note.title && content === note.content) {
      pendingSaveRef.current = null
      return
    }
    pendingSaveRef.current = { id: note.id, title, content }
    const timer = setTimeout(async () => {
      pendingSaveRef.current = null
      await updateNote(note.id, { title, content })
      setSaveStatus('saved')
    }, 800)
    return () => clearTimeout(timer)
  }, [title, content, note.id, note.title, note.content, updateNote])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        flushPendingSave()
        setSaveStatus('saved')
        toast.success('Note saved')
      } else if (key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent(OPEN_FIND_REPLACE_EVENT))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flushPendingSave])

  const wordCount =
    useEditorState({
      editor,
      selector: ({ editor }) => {
        const storage = editor?.storage as unknown as
          | { characterCount?: { words: () => number } }
          | undefined
        return storage?.characterCount?.words() ?? 0
      }
    }) ?? 0

  const readingTime = useMemo(
    () => (wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 200))),
    [wordCount]
  )

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value)
    setSaveStatus('saving')
  }, [])

  const handleEditorChange = useCallback((markdown: string) => {
    setContent(markdown)
    setSaveStatus('saving')
  }, [])

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

  const handleDelete = useCallback(async () => {
    if (!isBook) {
      const ok = await confirmDialog({
        title: isSubPage ? 'Delete page?' : 'Delete note?',
        description: `"${note.title || 'Untitled'}" will be permanently deleted.`,
        confirmText: 'Delete',
        destructive: true
      })
      if (!ok) return
    }
    void deleteNote(note.id)
  }, [note, isBook, isSubPage, deleteNote])

  return (
    <div className="flex flex-1 select-text flex-col overflow-hidden bg-background">
      <DocumentHeader
        title={title}
        saveStatus={saveStatus}
        isBook={isBook}
        subPageCount={childNotes.length}
        isSubPage={isSubPage}
        hasContent={wordCount > 0}
        focusMode={focusMode}
        outlineOpen={outlineOpen}
        pinned={!!note.pinned}
        fullWidth={!!note.fullWidth}
        editor={editor}
        onNavigateHome={() => setSelectedNoteId(null)}
        onToggleFocus={() => setFocusMode((f) => !f)}
        onToggleOutline={() => setOutlineOpen((o) => !o)}
        onToggleFullWidth={() => void updateNote(note.id, { fullWidth: !note.fullWidth })}
        onTogglePinned={() => void toggleNotePinned(note.id)}
        onDuplicate={() => void duplicateNote(note.id)}
        onCopyMarkdown={handleCopyMarkdown}
        onExport={handleExport}
        onDelete={handleDelete}
      />

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
              'relative z-10 mx-auto w-full px-6 py-6 pb-28 md:px-12',
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
                    Empty page — type / for blocks
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
              fontClass="font-sans-editor"
              onEditorReady={setEditor}
              onChange={handleEditorChange}
              onRewrite={handleRewrite}
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

        {outlineOpen && !focusMode && (
          <div className="hidden w-60 shrink-0 overflow-y-auto border-l border-border/50 bg-card/60 shadow-xs backdrop-blur-2xl md:block">
            {editor && <DocumentOutline editor={editor} onClose={() => setOutlineOpen(false)} />}
          </div>
        )}
      </div>

      <AiInlineToolbar
        state={ai.state}
        onAccept={() => editor && ai.accept(editor)}
        onReject={() => editor && ai.reject(editor)}
        onRegenerate={() => editor && void ai.regenerate(editor)}
        onStop={ai.stop}
      />
    </div>
  )
}

export const NotesView: React.FC = () => {
  const notes = useNotesStore((s) => s.notes)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const updateNote = useNotesStore((s) => s.updateNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const toggleNotePinned = useNotesStore((s) => s.toggleNotePinned)
  const duplicateNote = useNotesStore((s) => s.duplicateNote)
  const createChildPage = useNotesStore((s) => s.createChildPage)
  const getBacklinks = useNotesStore((s) => s.getBacklinks)

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null
  const [peekNoteId, setPeekNoteId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event): void => {
      const customEvent = e as CustomEvent<{ noteId: string }>
      const targetId = customEvent.detail?.noteId
      if (targetId) {
        if (notes.find((n) => n.id === targetId)) {
          setPeekNoteId(targetId)
        }
      }
    }
    window.addEventListener(OPEN_PAGE_PEEK_EVENT, handler)
    return () => window.removeEventListener(OPEN_PAGE_PEEK_EVENT, handler)
  }, [notes])

  const createNote = useNotesStore((s) => s.createNote)
  const { newBook, importing, handleImport } = useNoteCreation()

  if (!selectedNote) {
    return (
      <HomePage
        notes={notes}
        onOpenNote={setSelectedNoteId}
        onCreateNote={createNote}
        onNewBook={newBook}
        onImport={handleImport}
        importing={importing}
        onTogglePinned={toggleNotePinned}
        onDuplicate={duplicateNote}
        onDelete={deleteNote}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden relative">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={selectedNote.id}
          initial={{ opacity: 0, y: prefersReducedMotion() ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefersReducedMotion() ? 0 : -4 }}
          transition={{
            duration: prefersReducedMotion() ? 0 : duration.fast,
            ease: ease.out
          }}
          className="flex-1 min-h-0 overflow-hidden flex flex-col w-full h-full glass-gpu"
        >
          <NoteEditorCanvas
            note={selectedNote}
            notes={notes}
            setSelectedNoteId={setSelectedNoteId}
            updateNote={updateNote}
            deleteNote={deleteNote}
            toggleNotePinned={toggleNotePinned}
            duplicateNote={duplicateNote}
            createChildPage={createChildPage}
            getBacklinks={getBacklinks}
          />
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {peekNoteId && notes.some((n) => n.id === peekNoteId) && (
          <NotePeekPanel
            noteId={peekNoteId}
            notes={notes}
            onClose={() => setPeekNoteId(null)}
            onOpenFull={(id) => {
              setPeekNoteId(null)
              setSelectedNoteId(id)
            }}
            onPeek={(id) => setPeekNoteId(id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
