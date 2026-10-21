import type React from 'react'
import { useEffect, useState } from 'react'
import { NotesView } from './components/notes/NotesView'
import { NotesSidebarPanel } from './components/notes/sidebar/NotesSidebarPanel'
import type { SettingsTab } from './components/SettingsDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { TitleBar } from './components/TitleBar'
import { AppLogo } from './components/ui/AppLogo'
import { DialogDescription, DialogTitle } from './components/ui/dialog'
import { Sheet, SheetContent } from './components/ui/sheet'
import { useMediaQuery } from './components/ui/useMediaQuery'
import { ConfirmDialog } from './components/ui/confirm'
import { PanelResizeHandle } from './components/ui/PanelResizeHandle'
import { Toaster } from './components/ui/toast'
import { TooltipProvider } from './components/ui/tooltip'
import { useResizablePanel } from './components/ui/useResizablePanel'
import { cn } from './components/ui/utils'
import { useNotesStore } from './store/useNotesStore'

export const App: React.FC = () => {
  const compact = useMediaQuery('(max-width: 899px)')
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia('(max-width: 899px)').matches
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance')
  const loadNotes = useNotesStore((s) => s.loadNotes)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const createNote = useNotesStore((s) => s.createNote)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)

  const {
    width: sidebarWidth,
    isDragging,
    onHandleMouseDown
  } = useResizablePanel({
    initial: 256,
    min: 220,
    max: 360,
    storageKey: 'mynotes:sidebar-width',
    edge: 'right'
  })

  useEffect(() => {
    if (compact) setSidebarOpen(false)
  }, [compact])
  useEffect(() => {
    if (compact && selectedNoteId) setSidebarOpen(false)
  }, [compact, selectedNoteId])

  useEffect(() => {
    loadNotes()
    const unsub = window.api.cloud?.onVaultUpdated?.(() => {
      loadNotes()
    })
    return () => {
      unsub?.()
    }
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
          void createNote('Untitled notebook').then((id) => {
            if (id) void createNote('Untitled page', id)
          })
        } else {
          void createNote('Untitled page')
        }
      } else if (key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (key === '/' || key === '?') {
        e.preventDefault()
        setSettingsTab('shortcuts')
        setSettingsOpen(true)
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
      <div
        className={cn(
          'workspace-enter flex flex-col h-full w-full overflow-hidden bg-background text-foreground select-none',
          'font-sans'
        )}
      >
        <TitleBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onOpenSettings={(tab) => {
            if (tab) setSettingsTab(tab)
            setSettingsOpen(true)
          }}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {compact ? (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent
                side="left"
                id="notes-navigation"
                onOpenAutoFocus={(event) => {
                  event.preventDefault()
                  document.getElementById('notes-navigation')?.focus()
                }}
                className="w-[min(320px,88vw)] max-w-none gap-0 overflow-hidden bg-sidebar p-0"
              >
                <div className="flex h-14 shrink-0 items-center border-b border-border/50 px-4 pr-14">
                  <DialogTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <AppLogo size={24} />
                    <span>MyNotes</span>
                  </DialogTitle>
                </div>
                <DialogDescription className="sr-only">
                  Find a page or create a new one.
                </DialogDescription>
                <div className="min-h-0 flex-1">
                  <NotesSidebarPanel
                    onNavigate={() => setSidebarOpen(false)}
                    onOpenSettings={(tab) => {
                      setSidebarOpen(false)
                      if (tab) setSettingsTab(tab)
                      setSettingsOpen(true)
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <aside
              id="notes-navigation"
              aria-label="Page navigation"
              aria-hidden={!sidebarOpen}
              inert={!sidebarOpen}
              style={{
                width: sidebarOpen ? sidebarWidth : 0,
                transition: isDragging ? 'none' : undefined
              }}
              className="edge-dock relative h-full min-h-0 shrink-0 overflow-hidden bg-sidebar"
            >
              <div
                className="edge-dock-content relative flex h-full min-h-0 flex-col border-r border-border"
                data-open={sidebarOpen}
                style={{
                  width: sidebarWidth,
                  transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                  transition: isDragging ? 'none' : undefined
                }}
              >
                <NotesSidebarPanel
                  onOpenSettings={(tab) => {
                    if (tab) setSettingsTab(tab)
                    setSettingsOpen(true)
                  }}
                />
                <div className="absolute right-0 top-0 z-20 h-full w-2">
                  <PanelResizeHandle onMouseDown={onHandleMouseDown} isDragging={isDragging} />
                </div>
              </div>
            </aside>
          )}

          <main className="min-w-0 flex-1 min-h-0 flex flex-col overflow-hidden relative bg-background">
            <NotesView />
          </main>
        </div>

        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialTab={settingsTab}
        />

        <ConfirmDialog />

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
