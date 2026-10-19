import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  Command,
  Home,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  Sparkles,
  Sun
} from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import type { CloudSyncConfig } from '../types/notes'
import { useTheme } from '../context/ThemeContext'
import { useNotesStore } from '../store/useNotesStore'
import { NoteGlyph } from './notes/noteIcon'
import type { SettingsTab } from './SettingsDialog'
import appIcon from '../assets/icon.png'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { cn } from './ui/utils'

interface TitleBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenSettings: (tab?: SettingsTab) => void
  onOpenShortcuts: () => void
  onOpenReleaseNotes?: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export const TitleBar: React.FC<TitleBarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  onOpenShortcuts,
  onOpenReleaseNotes
}) => {
  const { theme, toggleTheme } = useTheme()
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig | null>(null)

  useEffect(() => {
    let mounted = true
    const checkCloud = async (): Promise<void> => {
      try {
        const res = await window.api?.cloud?.getConfig?.()
        if (res?.success && res.data && mounted) {
          setCloudConfig(res.data)
        }
      } catch {}
    }
    checkCloud()
    const unsub = window.api?.cloud?.onSyncStatusChange?.(() => {
      checkCloud()
    })
    return () => {
      mounted = false
      unsub?.()
    }
  }, [])
  const notes = useNotesStore((s) => s.notes)
  const selectedNoteId = useNotesStore((s) => s.selectedNoteId)
  const setSelectedNoteId = useNotesStore((s) => s.setSelectedNoteId)
  const canGoBack = useNotesStore((s) => s.navigationIndex > 0)
  const canGoForward = useNotesStore((s) => s.navigationIndex < s.navigationHistory.length - 1)
  const goBack = useNotesStore((s) => s.goBack)
  const goForward = useNotesStore((s) => s.goForward)

  const activeNote = notes.find((n) => n.id === selectedNoteId) || null
  const isBook = activeNote ? notes.some((n) => n.parentId === activeNote.id) : false

  return (
    <div
      data-slot="titlebar"
      data-tauri-drag-region
      className={cn(
        'drag-region flex items-center justify-between w-full h-10 select-none shrink-0 z-50 bg-background/85 border-b border-border/40 backdrop-blur-xl text-foreground',
        isMac ? 'pl-[92px] pr-3.5' : 'px-3.5'
      )}
    >
      {/* Left Navigation Cluster */}
      <div className="no-drag flex items-center gap-1.5">
        {/* Sidebar Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggleSidebar}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          </TooltipContent>
        </Tooltip>

        {/* Back / Forward segmented history group */}
        <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => goBack()}
                disabled={!canGoBack}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-25 transition-all cursor-pointer disabled:cursor-not-allowed"
                aria-label="Back"
              >
                <ArrowLeft className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => goForward()}
                disabled={!canGoForward}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 disabled:opacity-25 transition-all cursor-pointer disabled:cursor-not-allowed"
                aria-label="Forward"
              >
                <ArrowRight className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Forward</TooltipContent>
          </Tooltip>
        </div>

        {/* Home Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={selectedNoteId === null ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedNoteId(null)}
              className={cn(
                'h-7 px-2.5 gap-1.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold',
                selectedNoteId === null
                  ? 'text-notes bg-notes/15 hover:bg-notes/25 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              )}
              aria-label="Home Dashboard"
            >
              <Home className="size-3.5" />
              <span>Home</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Home Dashboard (⌘H)</TooltipContent>
        </Tooltip>

        <div className="h-3.5 w-px bg-border/60 mx-1 shrink-0" />

        {/* Brand identity */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setSelectedNoteId(null)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold text-foreground/90 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer select-none"
            >
              <img
                src={appIcon}
                alt="myNotes"
                className="size-5 rounded-md shadow-2xs object-cover"
              />
              <span className="tracking-tight font-bold">myNotes</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Workspace Home</TooltipContent>
        </Tooltip>
      </div>

      {/* Middle Area: Clean Draggable space with subtle centered document indicator */}
      <div data-tauri-drag-region className="flex-1 h-full drag-region flex items-center justify-center px-4">
        {activeNote ? (
          <div className="no-drag flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/40 bg-card/40 text-2xs text-muted-foreground max-w-sm truncate shadow-3xs backdrop-blur-md">
            <NoteGlyph icon={activeNote.icon} isBook={isBook} className="size-3 shrink-0" />
            <span className="truncate font-medium text-foreground/80">
              {activeNote.title || 'Untitled'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right Controls */}
      <div className="no-drag flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onOpenShortcuts}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              aria-label="Keyboard Shortcuts"
            >
              <Command className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Keyboard Shortcuts (⌘/)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleTheme}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="size-3.5 text-amber-500" />
              ) : (
                <Moon className="size-3.5 text-blue-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>

        {/* Cloud Sync Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onOpenSettings('cloud')}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer relative"
              aria-label="Cloud Sync"
            >
              {cloudConfig?.isSyncing ? (
                <RefreshCw className="size-3.5 text-blue-500 animate-spin" />
              ) : cloudConfig?.isConnected ? (
                <div className="relative flex items-center justify-center">
                  <Cloud className="size-3.5 text-emerald-500" />
                  <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 shadow-xs" />
                </div>
              ) : (
                <Cloud className="size-3.5 opacity-60 hover:opacity-100" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {cloudConfig?.isSyncing
              ? 'Syncing with Google Drive...'
              : cloudConfig?.isConnected
                ? 'Google Drive: Connected & Synced'
                : 'Connect Google Drive Storage'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onOpenSettings()}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              aria-label="Settings"
            >
              <Settings className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings (⌘,)</TooltipContent>
        </Tooltip>

        {/* What's New / Release Notes */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onOpenReleaseNotes}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              aria-label="What's New in v1.0.0"
            >
              <Sparkles className="size-3.5 text-amber-500/80 hover:text-amber-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">What's New in v1.0.0</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
