import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import {
  ArrowLeft,
  ArrowRight,
  Command,
  Moon,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun
} from 'lucide-react'
import type React from 'react'
import { useTheme } from '../context/ThemeContext'
import { useNotesStore } from '../store/useNotesStore'

interface TitleBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onOpenSettings: () => void
  onOpenShortcuts: () => void
}

export const TitleBar: React.FC<TitleBarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
  onOpenShortcuts
}) => {
  const { theme, toggleTheme } = useTheme()
  const canGoBack = useNotesStore((s) => s.navigationIndex > 0)
  const canGoForward = useNotesStore(
    (s) => s.navigationIndex < s.navigationHistory.length - 1
  )
  const goBack = useNotesStore((s) => s.goBack)
  const goForward = useNotesStore((s) => s.goForward)

  return (
    <div
      data-slot="titlebar"
      className="drag-region flex items-center justify-between w-full h-10 px-3 pl-20 select-none shrink-0 z-50 bg-background/90 border-b border-border/40 backdrop-blur-xl text-foreground"
    >
      {/* Left controls */}
      <div className="no-drag flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleSidebar}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
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

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => goBack()}
                disabled={!canGoBack}
                className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Back"
              >
                <ArrowLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => goForward()}
                disabled={!canGoForward}
                className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label="Forward"
              >
                <ArrowRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Forward</TooltipContent>
          </Tooltip>
        </div>

        <div className="h-3.5 w-px bg-border/40 mx-1 shrink-0" />

        <div className="flex items-center gap-1.5 px-1 font-semibold text-xs text-foreground tracking-tight select-none">
          <span className="flex size-5 items-center justify-center rounded-md bg-notes/10 text-notes">
            <NotebookPen className="size-3" />
          </span>
          <span>myNotes</span>
        </div>
      </div>

      {/* Middle draggable area */}
      <div className="flex-1 h-full drag-region" />

      {/* Right controls */}
      <div className="no-drag flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenShortcuts}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              aria-label="Keyboard Shortcuts"
            >
              <Command className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Keyboard Shortcuts</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4 text-blue-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSettings}
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
