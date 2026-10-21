import { isTauri } from '@tauri-apps/api/core'
import {
  ArrowLeft,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  PenSquare,
  Search,
  Settings
} from 'lucide-react'
import type React from 'react'
import type { SettingsTab } from './SettingsDialog'
import { useNotesStore } from '../store/useNotesStore'
import { Button } from './ui/button'
import { AppLogo } from './ui/AppLogo'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { cn } from './ui/utils'

interface TitleBarProps {
  sidebarOpen: boolean
  sidebarWidth?: number
  compact?: boolean
  onToggleSidebar: () => void
  onOpenSettings: (tab?: SettingsTab) => void
  onCreateNote?: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export const TitleBar: React.FC<TitleBarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  onCreateNote
}) => {
  const canGoBack = useNotesStore((s) => s.navigationIndex > 0)
  const canGoForward = useNotesStore((s) => s.navigationIndex < s.navigationHistory.length - 1)
  const goBack = useNotesStore((s) => s.goBack)
  const goForward = useNotesStore((s) => s.goForward)
  const createNote = useNotesStore((s) => s.createNote)
  const setNotesSearchQuery = useNotesStore((s) => s.setNotesSearchQuery)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)

  const handleCreate = () => {
    if (onCreateNote) {
      onCreateNote()
    } else {
      void createNote('Untitled page')
    }
  }

  const isNativeMac = isMac && isTauri()

  return (
    <header
      data-slot="titlebar"
      data-tauri-drag-region
      className={cn(
        'relative flex h-12 w-full shrink-0 items-center justify-between px-3 select-none z-30',
        'bg-sidebar/80 backdrop-blur-md border-b border-border/40 transition-colors'
      )}
    >
      {/* Left Section: macOS traffic lights + Sidebar Toggle + App Branding */}
      <div className="flex items-center gap-2 min-w-0">
        {/* macOS Traffic Lights / Space */}
        {isNativeMac ? (
          <div className="w-[72px] shrink-0" data-tauri-drag-region />
        ) : (
          <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 shrink-0" data-tauri-drag-region>
            <span className="size-3 rounded-full bg-[#ff5f57] border border-[#e0443e] inline-block shadow-2xs" />
            <span className="size-3 rounded-full bg-[#febc2e] border border-[#d89e24] inline-block shadow-2xs" />
            <span className="size-3 rounded-full bg-[#28c840] border border-[#1aab29] inline-block shadow-2xs" />
          </div>
        )}

        {/* Sidebar Toggle Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="notes-navigation"
              className="size-8 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-2xs transition-all"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {sidebarOpen ? 'Collapse sidebar (⌘\\)' : 'Expand sidebar (⌘\\)'}
          </TooltipContent>
        </Tooltip>

        {/* App Logo & Wordmark (always visible when sidebar collapsed, or brand header) */}
        <button
          type="button"
          onClick={() => setSelectedNoteId(null)}
          className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-card/60 transition-colors"
          title="Return to Home"
        >
          <AppLogo size={24} />
          <span className="text-sm font-semibold tracking-tight text-foreground font-sans">
            MyNotes
          </span>
        </button>

        {/* Navigation History Controls */}
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="Back"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goForward}
            disabled={!canGoForward}
            aria-label="Forward"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Center drag region */}
      <div className="flex-1 h-full cursor-default" data-tauri-drag-region />

      {/* Right Section: Floating Action Cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Action Pill Cluster */}
        <div className="flex items-center rounded-full bg-card border border-border/70 p-0.5 shadow-2xs">
          {/* Quick New Note / Pencil */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCreate}
                aria-label="New note"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <PenSquare className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New note (⌘N)</TooltipContent>
          </Tooltip>

          {/* Quick Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  setNotesSearchQuery('')
                  const searchInput = document.querySelector<HTMLInputElement>(
                    'input[aria-label="Search your pages"], input[aria-label="Search notes"]'
                  )
                  searchInput?.focus()
                }}
                aria-label="Search"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Search className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Find in notes</TooltipContent>
          </Tooltip>
        </div>

        {/* Settings button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenSettings()}
              aria-label="Settings and help"
              className="size-8 rounded-full text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-2xs transition-all"
            >
              <Settings className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings (⌘,)</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
