import { AnimatePresence } from 'framer-motion'
import type React from 'react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useNotesStore } from '../../store/useNotesStore'
import { Button } from '../ui/button'
import { OPEN_PAGE_PEEK_EVENT } from './editor/editorProps'
import { WorkspaceSkeleton } from './WorkspaceSkeleton'
import { HomePage } from './home/HomePage'
import { useNoteCreation } from './sidebar/NotesSidebarPanel'

const NoteEditorCanvas = lazy(() =>
  import('./NoteEditorCanvas').then((module) => ({ default: module.NoteEditorCanvas }))
)
const NotePeekPanel = lazy(() =>
  import('./peek/NotePeekPanel').then((module) => ({ default: module.NotePeekPanel }))
)

export const NotesView: React.FC = () => {
  const notes = useNotesStore((s) => s.notes)
  const notesLoaded = useNotesStore((s) => s.notesLoaded)
  const notesLoadError = useNotesStore((s) => s.notesLoadError)
  const loadNotes = useNotesStore((s) => s.loadNotes)
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

  if (notesLoadError) {
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <h1 className="text-lg font-semibold">Could not load your notes</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{notesLoadError}</p>
        <Button onClick={() => void loadNotes()}>Try again</Button>
      </div>
    )
  }

  if (!notesLoaded && notes.length === 0) return <WorkspaceSkeleton />

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
      <div
        key={selectedNote.id}
        className="page-enter min-w-0 flex-1 min-h-0 overflow-hidden flex flex-col w-full h-full"
      >
        <Suspense fallback={<WorkspaceSkeleton editor />}>
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
        </Suspense>
      </div>
      <AnimatePresence>
        {peekNoteId && notes.some((n) => n.id === peekNoteId) && (
          <Suspense fallback={null}>
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
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  )
}
