import type React from 'react'
import { useEffect, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { NotesSidebarPanel } from './components/notes/sidebar/NotesSidebarPanel'
import { NotesView } from './components/notes/NotesView'
import { SettingsDialog } from './components/SettingsDialog'
import { KeyboardShortcutsDialog } from './components/KeyboardShortcutsDialog'
import { Toaster } from './components/ui/toast'
import { useResizablePanel } from './components/ui/useResizablePanel'
import { PanelResizeHandle } from './components/ui/PanelResizeHandle'
import { useNotesStore } from './store/useNotesStore'
import { useTheme } from './context/ThemeContext'
import { TooltipProvider } from './components/ui/tooltip'
import { ConfirmDialog } from './components/ui/confirm'
import { cn } from './components/ui/utils'

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const loadNotes = useNotesStore((s) => s.loadNotes)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const createNote = useNotesStore((s) => s.createNote)
  const { fontClass } = useTheme()

  const { width: sidebarWidth, isDragging, onHandleMouseDown } = useResizablePanel({
    initial: 280,
    min: 220,
    max: 440,
    storageKey: 'mynotes:sidebar-width',
    edge: 'right'
  })

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Global desktop keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return

      const key = e.key.toLowerCase()
      if (key === 'h' && !e.shiftKey) {
        e.preventDefault()
        setSelectedNoteId(null)
      } else if (key === 'n') {
        e.preventDefault()
        if (e.shiftKey) {
          void createNote('Untitled Book').then((id) => {
            if (id) void createNote('Untitled Page', id)
          })
        } else {
          void createNote('Untitled Page')
        }
      } else if (key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (key === '/' || key === '?') {
        e.preventDefault()
        setShortcutsOpen((v) => !v)
      } else if (key === '\\') {
        e.preventDefault()
        setSidebarOpen((v) => !v)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectedNoteId, createNote])

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none', fontClass)}>
        {/* macOS hiddenInset title bar */}
        <TitleBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        {/* Main Workspace Workspace */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {/* Sidebar */}
          {sidebarOpen && (
            <aside
              style={{ width: sidebarWidth }}
              className="relative h-full shrink-0 border-r border-border/50 bg-sidebar/50 backdrop-blur-xl flex flex-col min-h-0 overflow-hidden"
            >
              <NotesSidebarPanel />
              <div className="absolute right-0 top-0 h-full w-2 translate-x-1/2 z-20">
                <PanelResizeHandle onMouseDown={onHandleMouseDown} isDragging={isDragging} />
              </div>
            </aside>
          )}

          {/* Notes Editor & Reading Surface */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative bg-background">
            <NotesView />
          </main>
        </div>

        {/* Modal Dialogs */}
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

        {/* Confirmation dialog provider */}
        <ConfirmDialog />

        {/* Toast notifications container */}
        <Toaster />
      </div>
    </TooltipProvider>
  )
}

