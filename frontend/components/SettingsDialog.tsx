import {
  Check,
  ChevronDown,
  Cloud,
  DatabaseBackup,
  Download,
  Info,
  Keyboard,
  Laptop,
  Loader2,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  Sparkles,
  Sun,
  Upload
} from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useNotesStore } from '../store/useNotesStore'
import type { CloudSyncConfig, EditorFont, Palette as PaletteType } from '../types/notes'
import { Button } from './ui/button'
import { confirmDialog } from './ui/confirm'
import { DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { Sheet, SheetContent } from './ui/sheet'
import { toast } from './ui/toast'
import { KeyboardShortcutsContent } from './KeyboardShortcuts'
import { ReleaseNotesContent } from './ReleaseNotes'
import { APP_VERSION } from '../data/releaseNotes'
import { cn } from './ui/utils'

export type SettingsTab = 'appearance' | 'cloud' | 'data' | 'shortcuts' | 'updates' | 'about'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: SettingsTab
}

const PALETTES: { id: PaletteType; label: string; description: string; swatch: string }[] = [
  { id: 'blue', label: 'Blue', description: 'Blue accents', swatch: '#3b82f6' },
  { id: 'amber', label: 'Amber', description: 'Amber accents', swatch: '#f59e0b' },
  { id: 'violet', label: 'Violet', description: 'Purple accents', swatch: '#8b5cf6' },
  {
    id: 'emerald',
    label: 'Green',
    description: 'Green accents',
    swatch: '#10b981'
  },
  { id: 'rose', label: 'Rose', description: 'Pink accents', swatch: '#f43f5e' }
]

const FONTS: { id: EditorFont; label: string; sample: string; className: string }[] = [
  {
    id: 'font-sans-editor',
    label: 'Inter Sans',
    sample: 'The quick brown fox jumps over the lazy dog.',
    className: 'font-sans-editor'
  },
  {
    id: 'font-serif-editor',
    label: 'Merriweather Serif',
    sample: 'The quick brown fox jumps over the lazy dog.',
    className: 'font-serif-editor'
  },
  {
    id: 'font-mono-editor',
    label: 'JetBrains Mono',
    sample: 'The quick brown fox jumps over the lazy dog.',
    className: 'font-mono-editor'
  }
]

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'size-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
)

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const { theme, setTheme, palette, setPalette, fontClass, setFontClass } = useTheme()
  const loadNotes = useNotesStore((s) => s.loadNotes)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Cloud sync state
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  // Load cloud config when dialog opens
  useEffect(() => {
    if (!open) return
    let isCurrent = true

    const fetchConfig = async (): Promise<void> => {
      try {
        const res = await window.api?.cloud?.getConfig?.()
        if (res?.success && res.data && isCurrent) {
          setCloudConfig(res.data)
        }
      } catch (e) {
        console.error('Failed to load cloud config:', e)
      }
    }

    fetchConfig()

    const unsub = window.api?.cloud?.onSyncStatusChange?.(() => {
      fetchConfig()
    })

    return () => {
      isCurrent = false
      unsub?.()
    }
  }, [open])

  const handleBackup = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const res = await window.api.storage.backup()
      if (res.success && res.data) {
        toast.success('Backup created successfully', { description: res.data })
      } else if (res.error !== 'Canceled by user') {
        toast.error('Backup failed', {
          description: res.error || 'Could not export database backup'
        })
      }
    } catch (e: unknown) {
      toast.error('Backup error', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsExporting(false)
    }
  }

  const handleRestore = async (): Promise<void> => {
    const ok = await confirmDialog({
      title: 'Restore from backup?',
      description:
        'This replaces all notes and attachments with the selected backup. Create a backup first to keep your current notes.',
      confirmText: 'Choose backup',
      destructive: true
    })
    if (!ok) return

    setIsImporting(true)
    try {
      const res = await window.api.storage.restore()
      if (res.success) {
        await loadNotes()
        toast.success('Backup restored successfully', {
          description: 'Your notes and attachments have been reloaded.'
        })
      } else if (res.error !== 'Canceled by user') {
        toast.error('Restore failed', { description: res.error || 'Could not restore backup' })
      }
    } catch (e: unknown) {
      toast.error('Restore error', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsImporting(false)
    }
  }

  const handleCloudLogin = async (): Promise<void> => {
    setIsLoggingIn(true)
    try {
      const res = await window.api?.cloud?.login?.()
      if (res?.success) {
        // Sign-in finishes in the browser; config refreshes via the cloud:sync-* events
        toast.info('Continue in your browser', {
          description: 'Finish signing in with Google in the browser window that just opened.'
        })
        const configRes = await window.api?.cloud?.getConfig?.()
        if (configRes?.success && configRes.data) {
          setCloudConfig(configRes.data)
        }
        await loadNotes()
      } else {
        toast.error('Google Sign-In Failed', {
          description: res?.error || 'Could not complete Google authentication'
        })
      }
    } catch (e) {
      toast.error('Sign-in error', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleCloudLogout = async (): Promise<void> => {
    const ok = await confirmDialog({
      title: 'Disconnect Google Drive?',
      description:
        'Your local notes will remain safely stored on this computer. Cloud synchronization will pause until you reconnect.',
      confirmText: 'Disconnect Account'
    })
    if (!ok) return

    try {
      const res = await window.api?.cloud?.logout?.()
      if (res?.success) {
        toast.info('Google Drive disconnected', {
          description: 'Local notes are preserved.'
        })
        const configRes = await window.api?.cloud?.getConfig?.()
        if (configRes?.success && configRes.data) {
          setCloudConfig(configRes.data)
        }
      }
    } catch (e) {
      toast.error('Disconnect error', { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const handleCloudSyncNow = async (): Promise<void> => {
    setIsSyncing(true)
    try {
      const res = await window.api?.cloud?.syncNow?.()
      if (res?.success) {
        toast.success('Sync complete', {
          description: `Synced ${res.data?.notesCount ?? 0} notes with your Google Drive vault.`
        })
        await loadNotes()
        const configRes = await window.api?.cloud?.getConfig?.()
        if (configRes?.success && configRes.data) {
          setCloudConfig(configRes.data)
        }
      } else {
        toast.error('Sync failed', {
          description: res?.error || 'Could not sync with Google Drive'
        })
      }
    } catch (e) {
      toast.error('Sync error', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleToggleAutoSync = async (enabled: boolean): Promise<void> => {
    try {
      const result = await window.api.cloud.setAutoSync(enabled)
      if (!result.success) throw new Error(result.error || 'Please try again.')
      setCloudConfig((prev) => (prev ? { ...prev, autoSync: enabled } : null))
      toast.info(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled')
    } catch (e) {
      toast.error('Could not change automatic sync', {
        description: e instanceof Error ? e.message : 'Please try again.'
      })
    }
  }

  const sections = [
    {
      id: 'appearance',
      label: 'Appearance',
      icon: Palette,
      description: 'Make this space your own.'
    },
    {
      id: 'cloud',
      label: 'Cloud sync',
      icon: Cloud,
      description: 'Keep your notes in your Google Drive.'
    },
    {
      id: 'data',
      label: 'Backup and restore',
      icon: DatabaseBackup,
      description: 'Keep a separate copy of your notes and files.'
    },
    {
      id: 'shortcuts',
      label: 'Keyboard shortcuts',
      icon: Keyboard,
      description: 'A few shortcuts to keep you in the flow.'
    },
    {
      id: 'updates',
      label: 'What’s new',
      icon: Sparkles,
      description: 'Changes and improvements to myNotes.'
    },
    {
      id: 'about',
      label: 'About',
      icon: Info,
      description: 'A quiet place for notes and documents.'
    }
  ] as const
  const section = sections.find((item) => item.id === activeTab) || sections[0]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
          <DialogTitle>Settings and help</DialogTitle>
          <DialogDescription className="text-xs">
            Preferences, sync, and everything else in one place.
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 border-b border-border p-3 sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label="Settings section"
                className="h-10 w-full justify-between px-3 text-sm"
              >
                {section.label}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {sections.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  aria-current={activeTab === item.id ? 'true' : undefined}
                  onClick={() => setActiveTab(item.id)}
                  className="py-2.5"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Settings sections"
            className="hidden w-48 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3 sm:flex"
          >
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? 'page' : undefined}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs transition-colors',
                  activeTab === item.id
                    ? 'bg-notes/10 font-medium text-notes'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </button>
            ))}
            <span className="mt-auto px-3 py-2 text-xs text-muted-foreground">
              myNotes · {APP_VERSION}
            </span>
          </nav>
          <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-7">
            <header className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight">{section.label}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {section.description}
              </p>
            </header>
            {activeTab === 'appearance' && (
              <div className="space-y-7">
                <section>
                  <h3 className="mb-3 text-sm font-medium">Theme</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Laptop }
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={theme === mode.id}
                        onClick={() => setTheme(mode.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border p-4 text-xs transition-colors',
                          theme === mode.id
                            ? 'border-notes bg-notes/5 text-notes'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        )}
                      >
                        <mode.icon className="size-5" />
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="mb-3 text-sm font-medium">Accent color</h3>
                  <div className="flex flex-wrap gap-2">
                    {PALETTES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={palette === item.id}
                        onClick={() => setPalette(item.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-3 py-2 text-xs',
                          palette === item.id
                            ? 'border-notes bg-notes/5'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <span
                          className="flex size-4 items-center justify-center rounded-full"
                          style={{ backgroundColor: item.swatch }}
                        >
                          {palette === item.id && <Check className="size-3 text-white" />}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="mb-1 text-sm font-medium">Editor font</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Applies to your writing. Menus and navigation stay the same.
                  </p>
                  <div className="space-y-2">
                    {FONTS.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        aria-pressed={fontClass === font.id}
                        onClick={() => setFontClass(font.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left',
                          fontClass === font.id
                            ? 'border-notes bg-notes/5'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <span>
                          <span className="block text-xs font-medium">{font.label}</span>
                          <span
                            className={cn(
                              'mt-1 block text-sm text-muted-foreground',
                              font.className
                            )}
                          >
                            {font.sample}
                          </span>
                        </span>
                        {fontClass === font.id && <Check className="size-4 shrink-0 text-notes" />}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {activeTab === 'cloud' && (
              <div className="space-y-5">
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Cloud className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium">
                        {cloudConfig?.isConnected
                          ? 'Google Drive connected'
                          : 'Connect Google Drive'}
                      </h3>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {cloudConfig?.isConnected
                          ? cloudConfig.userEmail
                          : 'Optional. Your notes work offline without an account.'}
                      </p>
                    </div>
                  </div>
                  {cloudConfig?.isConnected ? (
                    <div className="space-y-4">
                      <div className="text-xs leading-relaxed text-muted-foreground">
                        {cloudConfig.isSyncing || isSyncing
                          ? 'Syncing your notes…'
                          : cloudConfig.lastError
                            ? 'Your latest sync could not finish.'
                            : cloudConfig.lastSyncTime
                              ? `Last synced ${new Date(cloudConfig.lastSyncTime).toLocaleString()}`
                              : 'Ready to sync.'}
                      </div>
                      {cloudConfig.lastError && (
                        <p role="alert" className="break-words text-xs text-destructive">
                          {cloudConfig.lastError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={isSyncing || cloudConfig.isSyncing}
                          onClick={() => void handleCloudSyncNow()}
                        >
                          <RefreshCw className={cn('size-3.5', isSyncing && 'animate-spin')} />
                          {isSyncing ? 'Syncing…' : 'Sync now'}
                        </Button>
                        <Button variant="outline" onClick={() => void handleCloudLogout()}>
                          <LogOut className="size-3.5" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        disabled={isLoggingIn || !cloudConfig?.isReady}
                        onClick={() => void handleCloudLogin()}
                      >
                        {isLoggingIn ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <GoogleGIcon />
                        )}{' '}
                        {isLoggingIn ? 'Connecting…' : 'Sign in with Google'}
                      </Button>
                      {!cloudConfig?.isReady && (
                        <p className="text-xs text-muted-foreground">
                          Google Drive sync is not available in this build.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {cloudConfig?.isConnected && (
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <span>
                      <span className="block text-sm font-medium">Sync automatically</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Keep Google Drive up to date while you work.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={cloudConfig.autoSync}
                      onChange={(event) => void handleToggleAutoSync(event.target.checked)}
                      className="size-4 accent-[var(--notes)]"
                    />
                  </label>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Notes and files are stored in the app’s private Google Drive folder. myNotes does
                  not add end-to-end encryption. Disconnecting keeps the notes on this device.
                </p>
              </div>
            )}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <section className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium">Create a backup</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Save your pages, attachments, and preferences in one file. Keep it somewhere
                    safe.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => void handleBackup()}
                    disabled={isExporting}
                  >
                    <Download className="size-3.5" />
                    {isExporting ? 'Creating backup…' : 'Save backup'}
                  </Button>
                </section>
                <section className="rounded-lg border border-border p-4">
                  <h3 className="text-sm font-medium">Restore a backup</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Replace your current pages and attachments with a saved backup. Create a backup
                    first if you want to keep them.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => void handleRestore()}
                    disabled={isImporting}
                  >
                    <Upload className="size-3.5" />
                    {isImporting ? 'Restoring…' : 'Choose backup'}
                  </Button>
                </section>
              </div>
            )}
            {activeTab === 'shortcuts' && <KeyboardShortcutsContent />}
            {activeTab === 'updates' && <ReleaseNotesContent />}
            {activeTab === 'about' && (
              <div className="space-y-5">
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-base font-semibold">myNotes</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Version {APP_VERSION}</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Write, organize, and find your notes. Your pages live on this device, with
                    optional Google Drive sync.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('updates')}>
                    What’s new
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('shortcuts')}>
                    Keyboard shortcuts
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
