import { isTauri } from '@tauri-apps/api/core'
import {
  ArrowLeft,
  ArrowRight,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings
} from 'lucide-react'
import type React from 'react'
import { useNotesStore } from '../store/useNotesStore'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { cn } from './ui/utils'

interface TitleBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenSettings: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

export const TitleBar: React.FC<TitleBarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings
}) => {
  const canGoBack = useNotesStore((s) => s.navigationIndex > 0)
  const canGoForward = useNotesStore((s) => s.navigationIndex < s.navigationHistory.length - 1)
  const goBack = useNotesStore((s) => s.goBack)
  const goForward = useNotesStore((s) => s.goForward)

  return (
    <header
      data-slot="titlebar"
      data-tauri-drag-region
      className={cn(
        'grid h-12 w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 bg-background px-3 select-none',
        isMac && isTauri() && '[&>nav]:pl-[84px]'
      )}
    >
      <nav aria-label="Page navigation controls" className="flex min-w-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="notes-navigation"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{sidebarOpen ? 'Close sidebar' : 'Open sidebar'}</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Back"
          className="hidden sm:inline-flex"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={goForward}
          disabled={!canGoForward}
          aria-label="Forward"
          className="hidden sm:inline-flex"
        >
          <ArrowRight className="size-4" />
        </Button>
      </nav>
      <div
        data-tauri-drag-region
        className="flex items-center justify-center gap-2 text-sm font-semibold tracking-tight text-foreground"
      >
        <NotebookPen aria-hidden="true" className="pointer-events-none size-4 text-notes" />
        <span className="pointer-events-none">myNotes</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        aria-label="Settings and help"
        className="h-8 shrink-0 justify-self-end gap-2 text-muted-foreground"
      >
        <Settings className="size-4" />
        <span className="hidden sm:inline">Settings</span>
      </Button>
    </header>
  )
}
