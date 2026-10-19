import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  DatabaseBackup,
  Download,
  Info,
  Key,
  Laptop,
  Loader2,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload
} from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import appIcon from '../assets/icon.png'
import { useTheme } from '../context/ThemeContext'
import { useNotesStore } from '../store/useNotesStore'
import type { CloudSyncConfig, EditorFont, Palette as PaletteType, ThemeMode } from '../types/notes'
import { Button } from './ui/button'
import { confirmDialog } from './ui/confirm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { toast } from './ui/toast'
import { APP_VERSION } from '../data/releaseNotes'
import { cn } from './ui/utils'

export type SettingsTab = 'appearance' | 'cloud' | 'data' | 'about'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: SettingsTab
  onOpenReleaseNotes?: () => void
}

const PALETTES: { id: PaletteType; label: string; description: string; swatch: string }[] = [
  { id: 'blue', label: 'Default Ocean', description: 'Clean Slate & Blue', swatch: '#3b82f6' },
  { id: 'amber', label: 'Warm Amber', description: 'Cozy Glow & Warmth', swatch: '#f59e0b' },
  { id: 'violet', label: 'Deep Violet', description: 'Royal Lavender & Purple', swatch: '#8b5cf6' },
  {
    id: 'emerald',
    label: 'Emerald Forest',
    description: 'Serene Nature & Green',
    swatch: '#10b981'
  },
  { id: 'rose', label: 'Soft Rose', description: 'Modern Blush & Coral', swatch: '#f43f5e' }
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
    label: 'Lora Serif',
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
  initialTab,
  onOpenReleaseNotes
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
  const [showCredsSetup, setShowCredsSetup] = useState(false)
  const [customClientId, setCustomClientId] = useState('')
  const [customClientSecret, setCustomClientSecret] = useState('')
  const [customAuthServerUrl, setCustomAuthServerUrl] = useState('')
  const [isSavingCreds, setIsSavingCreds] = useState(false)

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
      } else {
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
        'Restoring will merge or overwrite existing notes from the chosen backup archive.',
      confirmText: 'Choose Backup File…'
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
      } else if (res.error !== 'Restore canceled') {
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
        if (res?.error?.includes('Client ID')) {
          setShowCredsSetup(true)
        }
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
      await window.api?.cloud?.setAutoSync?.(enabled)
      setCloudConfig((prev) => (prev ? { ...prev, autoSync: enabled } : null))
      toast.info(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled')
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveCredentials = async (): Promise<void> => {
    const trimmedAuth = customAuthServerUrl.trim()
    const trimmedClientId = customClientId.trim()
    const trimmedSecret = customClientSecret.trim()

    if (!trimmedAuth && !trimmedClientId) {
      toast.error('Configuration required', {
        description: 'Please enter either a Cloudflare Auth Relay URL or a Google Client ID.'
      })
      return
    }

    setIsSavingCreds(true)
    try {
      const res = await window.api?.cloud?.saveCredentials?.(
        trimmedClientId || undefined,
        trimmedSecret || undefined,
        trimmedAuth || undefined
      )
      if (res?.success) {
        toast.success('Configuration saved', {
          description: trimmedAuth
            ? 'Cloudflare Auth Relay configured successfully.'
            : 'Custom Google OAuth credentials configured successfully.'
        })
        const configRes = await window.api?.cloud?.getConfig?.()
        if (configRes?.success && configRes.data) {
          setCloudConfig(configRes.data)
        }
        setShowCredsSetup(false)
      } else {
        toast.error('Failed to save configuration', { description: res?.error })
      }
    } catch (e) {
      toast.error('Error saving credentials', {
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setIsSavingCreds(false)
    }
  }

  const handleResetCredentials = async (): Promise<void> => {
    setIsSavingCreds(true)
    try {
      const res = await window.api?.cloud?.resetCredentials?.()
      if (res?.success) {
        toast.success('Reset to default configuration', {
          description: 'Reverted to built-in configuration.'
        })
        setCustomClientId('')
        setCustomClientSecret('')
        setCustomAuthServerUrl('')
        const configRes = await window.api?.cloud?.getConfig?.()
        if (configRes?.success && configRes.data) {
          setCloudConfig(configRes.data)
        }
      } else {
        toast.error('Failed to reset credentials', { description: res?.error })
      }
    } catch (e) {
      toast.error('Error resetting credentials', {
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setIsSavingCreds(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88vh,660px)] w-[94vw] sm:w-[800px] max-w-[94vw] sm:max-w-[800px] flex-col gap-0 overflow-hidden p-0 rounded-2xl border border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl text-foreground">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your myNotes appearance, cloud sync, and backup preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full min-h-0 flex-1">
          {/* Sidebar Tabs */}
          <div className="w-54 shrink-0 border-r border-border/40 bg-sidebar/50 p-3 flex flex-col gap-1">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
              Preferences
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer',
                activeTab === 'appearance'
                  ? 'bg-notes text-notes-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Palette className="size-4 shrink-0" />
              <span>Theme & Display</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer',
                activeTab === 'cloud'
                  ? 'bg-notes text-notes-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="size-4 shrink-0" />
                <span>Cloud Sync</span>
              </div>
              {cloudConfig?.isConnected && (
                <span className="size-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer',
                activeTab === 'data'
                  ? 'bg-notes text-notes-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <DatabaseBackup className="size-4 shrink-0" />
              <span>Backup & Restore</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer',
                activeTab === 'about'
                  ? 'bg-notes text-notes-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Info className="size-4 shrink-0" />
              <span>About myNotes</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Color Mode</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select your preferred window theme.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Laptop }
                    ].map((m) => {
                      const Icon = m.icon
                      const isSelected = theme === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTheme(m.id as ThemeMode)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl border p-3.5 text-xs font-medium transition-all cursor-pointer text-center',
                            isSelected
                              ? 'border-notes bg-notes/10 text-foreground ring-2 ring-notes/30 shadow-xs'
                              : 'border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          )}
                        >
                          <Icon className={cn('size-5', isSelected && 'text-notes')} />
                          <span>{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-5">
                  <h3 className="text-sm font-bold text-foreground">Accent Palette</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose an accent color tone for icons, active tabs and highlights.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                    {PALETTES.map((p) => {
                      const isSelected = palette === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPalette(p.id)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'border-notes bg-notes/10 ring-2 ring-notes/30 shadow-xs'
                              : 'border-border/60 bg-card/60 hover:bg-muted/50'
                          )}
                        >
                          <span
                            className="size-5 rounded-full shrink-0 border border-white/20 shadow-xs"
                            style={{ backgroundColor: p.swatch }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-foreground">{p.label}</div>
                            <div className="text-2xs text-muted-foreground">{p.description}</div>
                          </div>
                          {isSelected && <Check className="size-4 text-notes shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t border-border/40 pt-5">
                  <h3 className="text-sm font-bold text-foreground">Editor Typography</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize font family used across note writing canvases.
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 mt-3">
                    {FONTS.map((f) => {
                      const isSelected = fontClass === f.id
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFontClass(f.id)}
                          className={cn(
                            'flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'border-notes bg-notes/10 ring-2 ring-notes/30 shadow-xs'
                              : 'border-border/60 bg-card/60 hover:bg-muted/50'
                          )}
                        >
                          <div>
                            <div className="text-xs font-bold text-foreground">{f.label}</div>
                            <div
                              className={cn('text-xs text-muted-foreground mt-0.5', f.className)}
                            >
                              {f.sample}
                            </div>
                          </div>
                          {isSelected && <Check className="size-4 text-notes shrink-0 ml-2" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Cloud Sync Tab (Google Drive) */}
            {activeTab === 'cloud' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Google Drive Cloud Storage
                    </h3>
                    {cloudConfig?.isConnected ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-500 border border-emerald-500/20">
                        Active & Connected
                      </span>
                    ) : cloudConfig?.isReady ? (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-2xs font-semibold text-blue-500 border border-blue-500/20">
                        1-Click Connect Ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-500 border border-amber-500/20">
                        Setup Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect your personal Google account. All notes and attachments sync to your
                    Google Drive AppData folder with complete privacy.
                  </p>
                </div>

                {cloudConfig?.isConnected ? (
                  /* Connected State */
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {cloudConfig.userPicture ? (
                          <img
                            src={cloudConfig.userPicture}
                            alt="Google Avatar"
                            className="size-11 rounded-full border border-emerald-500/30 shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-bold shrink-0">
                            {cloudConfig.userName?.charAt(0) || 'G'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {cloudConfig.userName || 'Google Drive User'}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-3xs font-semibold text-emerald-500">
                              <CheckCircle2 className="size-2.5" />
                              Active Vault
                            </span>
                            {cloudConfig.hasAuthServer && (
                              <span className="rounded-full bg-blue-500/15 text-blue-400 text-3xs px-2 py-0.5 border border-blue-500/20 font-medium">
                                Cloudflare Relay
                              </span>
                            )}
                            {cloudConfig.hasCustomCreds && (
                              <span className="rounded-full bg-notes/20 text-notes text-3xs px-2 py-0.5 font-medium">
                                Custom Override
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-muted-foreground truncate">
                            {cloudConfig.userEmail}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloudLogout}
                        className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1.5 cursor-pointer"
                      >
                        <LogOut className="size-3.5" />
                        Disconnect
                      </Button>
                    </div>

                    {/* Sync Controls Card */}
                    <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            Vault Synchronization
                          </div>
                          <div className="text-2xs text-muted-foreground mt-0.5">
                            {cloudConfig.lastSyncTime ? (
                              <span>
                                Last synced: {new Date(cloudConfig.lastSyncTime).toLocaleString()}
                              </span>
                            ) : (
                              <span>Initial sync in progress...</span>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={handleCloudSyncNow}
                          disabled={isSyncing || cloudConfig.isSyncing}
                          className="h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-notes text-notes-foreground hover:bg-notes/90"
                        >
                          <RefreshCw
                            className={cn(
                              'size-3.5',
                              (isSyncing || cloudConfig.isSyncing) && 'animate-spin'
                            )}
                          />
                          {isSyncing || cloudConfig.isSyncing ? 'Syncing…' : 'Sync Now'}
                        </Button>
                      </div>

                      <div className="border-t border-border/30 pt-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-foreground">
                            Auto-sync changes
                          </div>
                          <div className="text-2xs text-muted-foreground">
                            Uploads note edits after 4 seconds and checks for remote updates every 5
                            mins.
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={cloudConfig.autoSync}
                          onChange={(e) => handleToggleAutoSync(e.target.checked)}
                          className="size-4 rounded accent-notes cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Privacy Guarantee Card */}
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 flex items-start gap-3 text-xs text-muted-foreground">
                      <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-foreground">
                          Encrypted in Google Drive AppData
                        </div>
                        <div className="text-2xs mt-0.5">
                          Stored inside your personal Google Drive hidden Application Data folder (
                          <code className="bg-muted px-1 py-0.5 rounded text-3xs">
                            mynotes_vault.json
                          </code>
                          ). Future mobile versions of myNotes will sync seamlessly with this exact
                          same file.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Disconnected State */
                  <div className="space-y-4">
                    {/* Developer banner if .env credentials missing */}
                    {!cloudConfig?.isReady && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-400">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                        <div>
                          <div className="font-semibold text-amber-500">
                            OAuth Configuration Needed for Cloud Sync
                          </div>
                          <div className="text-2xs text-muted-foreground mt-0.5">
                            Developers: Set{' '}
                            <code className="bg-muted px-1 py-0.5 rounded text-3xs font-mono">
                              AUTH_SERVER_URL
                            </code>{' '}
                            (recommended Cloudflare Worker) or{' '}
                            <code className="bg-muted px-1 py-0.5 rounded text-3xs font-mono">
                              GOOGLE_CLIENT_ID
                            </code>{' '}
                            in{' '}
                            <code className="bg-muted px-1 py-0.5 rounded text-3xs font-mono">
                              .env
                            </code>{' '}
                            to give all users 1-click Google Drive sync out of the box (see{' '}
                            <code className="bg-muted px-1 py-0.5 rounded text-3xs font-mono">
                              .env.example
                            </code>
                            ). You can also configure an Auth Relay URL in Developer Options below.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Main Connect Card */}
                    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-4 text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        <Cloud className="size-6" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-sm font-bold text-foreground">
                          Store your notes in your own Google Drive
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          No intermediate database or monthly server fees. You own 100% of your
                          notes in your personal Google account.
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <Button
                          onClick={handleCloudLogin}
                          disabled={isLoggingIn || !cloudConfig?.isReady}
                          className="w-full sm:w-auto px-6 h-9 mx-auto text-xs font-semibold gap-2.5 cursor-pointer bg-white text-zinc-900 hover:bg-zinc-100 shadow-md border border-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {isLoggingIn ? (
                            <Loader2 className="size-4 animate-spin text-zinc-700" />
                          ) : (
                            <GoogleGIcon className="size-4" />
                          )}
                          <span>
                            {isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}
                          </span>
                        </Button>

                        {cloudConfig?.isReady && (
                          <div className="flex items-center gap-1.5 text-3xs text-emerald-500 font-medium">
                            <CheckCircle2 className="size-3" />
                            <span>
                              {cloudConfig?.hasAuthServer
                                ? '1-click sync ready — secured by Cloudflare Auth Relay'
                                : '1-click sync ready — configured via .env'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feature Triad */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left">
                        <ShieldCheck className="size-4 text-emerald-500 mb-1.5" />
                        <div className="text-xs font-bold text-foreground">Zero-Server Privacy</div>
                        <div className="text-2xs text-muted-foreground mt-0.5">
                          Data travels directly between this device and Google. No third party
                          server ever sees your notes.
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left">
                        <DatabaseBackup className="size-4 text-notes mb-1.5" />
                        <div className="text-xs font-bold text-foreground">Local-First Speed</div>
                        <div className="text-2xs text-muted-foreground mt-0.5">
                          Notes are cached in local SQLite for instant search and offline edits,
                          syncing to Drive in background.
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-left">
                        <Laptop className="size-4 text-amber-500 mb-1.5" />
                        <div className="text-xs font-bold text-foreground">Future Mobile Ready</div>
                        <div className="text-2xs text-muted-foreground mt-0.5">
                          Upcoming mobile apps will connect to the exact same Google Drive vault for
                          seamless sync.
                        </div>
                      </div>
                    </div>

                    {/* Developer / Custom OAuth credentials dropdown */}
                    <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowCredsSetup(!showCredsSetup)}
                        className="w-full flex items-center justify-between p-3 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Key className="size-3.5 text-notes" />
                          <span>Developer Options (OAuth & Auth Relay)</span>
                          {cloudConfig?.hasCustomCreds && (
                            <span className="rounded-full bg-notes/20 text-notes text-3xs px-2 py-0.5">
                              Custom Override
                            </span>
                          )}
                        </span>
                        {showCredsSetup ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>

                      {showCredsSetup && (
                        <div className="p-4 pt-1 border-t border-border/30 space-y-3.5 text-xs">
                          <p className="text-2xs text-muted-foreground">
                            Configure how myNotes connects to Google Drive. The recommended and safest approach for distributed open-source builds is a free Cloudflare Worker auth relay, which keeps your Google Client Secret 100% private.
                          </p>

                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-2xs font-semibold text-foreground">
                                  Auth Server Relay URL (Cloudflare Worker)
                                </label>
                                <span className="text-3xs text-emerald-500 font-medium">
                                  Recommended • Zero Secrets in Binary
                                </span>
                              </div>
                              <input
                                type="url"
                                value={customAuthServerUrl}
                                onChange={(e) => setCustomAuthServerUrl(e.target.value)}
                                placeholder={
                                  cloudConfig?.authServerUrl ||
                                  'e.g. https://mynotes-auth.<your-subdomain>.workers.dev'
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/60 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-notes"
                              />
                              <p className="text-3xs text-muted-foreground mt-1">
                                Deploy the included <code className="font-mono">worker/</code> directory to Cloudflare Workers with free tier.
                              </p>
                            </div>

                            <div className="relative flex py-1 items-center">
                              <div className="flex-grow border-t border-border/30"></div>
                              <span className="flex-shrink mx-2 text-3xs text-muted-foreground font-medium uppercase tracking-wider">
                                Or Direct OAuth (Desktop PKCE)
                              </span>
                              <div className="flex-grow border-t border-border/30"></div>
                            </div>

                            <div>
                              <label className="text-2xs font-semibold text-foreground block mb-1">
                                Google Client ID
                              </label>
                              <input
                                type="text"
                                value={customClientId}
                                onChange={(e) => setCustomClientId(e.target.value)}
                                placeholder={
                                  cloudConfig?.clientId ||
                                  'e.g. 123456789-abcdef.apps.googleusercontent.com'
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/60 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-notes"
                              />
                            </div>

                            <div>
                              <label className="text-2xs font-semibold text-foreground block mb-1">
                                Google Client Secret (Optional for direct desktop OAuth)
                              </label>
                              <input
                                type="password"
                                value={customClientSecret}
                                onChange={(e) => setCustomClientSecret(e.target.value)}
                                placeholder={cloudConfig?.clientSecret || 'GOCSPX-••••••••'}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border/60 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-notes"
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                onClick={handleSaveCredentials}
                                disabled={isSavingCreds}
                                className="h-7 text-2xs font-semibold cursor-pointer bg-notes text-notes-foreground hover:bg-notes/90"
                              >
                                {isSavingCreds ? 'Saving…' : 'Save Configuration'}
                              </Button>

                              {cloudConfig?.hasCustomCreds && (
                                <Button
                                  variant="outline"
                                  onClick={handleResetCredentials}
                                  disabled={isSavingCreds}
                                  className="h-7 text-2xs font-semibold cursor-pointer gap-1"
                                >
                                  <RotateCcw className="size-3" />
                                  <span>Reset to .env Built-In</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Local Database Storage</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your notes, trees, links, and attachments are saved locally on this machine
                    using SQLite.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-notes/10 text-notes shrink-0">
                      <Download className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground">Export Full Backup</h4>
                      <p className="text-2xs text-muted-foreground mt-0.5">
                        Creates a portable, JSON-packaged backup of your entire library including
                        all markdown notes and file attachments.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleBackup}
                    disabled={isExporting}
                    className="w-full h-8 text-xs font-semibold gap-1.5 cursor-pointer bg-notes text-notes-foreground hover:bg-notes/90"
                  >
                    <Download className="size-3.5" />
                    {isExporting ? 'Exporting…' : 'Export Backup File'}
                  </Button>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                      <Upload className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground">
                        Restore from Backup Archive
                      </h4>
                      <p className="text-2xs text-muted-foreground mt-0.5">
                        Import notes and attachments from a previously exported{' '}
                        <code className="text-2xs bg-muted px-1 rounded">.json</code> backup
                        archive.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRestore}
                    disabled={isImporting}
                    className="w-full h-8 text-xs font-semibold gap-1.5 cursor-pointer border-border/80"
                  >
                    <Upload className="size-3.5" />
                    {isImporting ? 'Restoring…' : 'Select Backup to Restore'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/50 p-4">
                  <img
                    src={appIcon}
                    alt="myNotes icon"
                    className="size-14 rounded-2xl shadow-md border border-border/40 object-cover"
                  />
                  <div>
                    <h3 className="text-base font-bold text-foreground">myNotes</h3>
                    <p className="text-xs text-muted-foreground">
                      Version {APP_VERSION} (Tauri 2.0 Native Desktop)
                    </p>
                    <p className="text-2xs text-muted-foreground mt-1">
                      Standalone note-taking workspace with Notion-grade polish.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 divide-y divide-border/30 text-xs bg-muted/20">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Platform</span>
                    <span className="font-medium text-foreground">
                      Tauri 2.0 (Rust) &amp; macOS Apple Silicon
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Cloud Sync Engine</span>
                    <span className="font-medium text-foreground">
                      Google Drive AppData (BYOC / OAuth 2.0 PKCE)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Editor Engine</span>
                    <span className="font-medium text-foreground">TipTap v3 &amp; ProseMirror</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Storage Engine</span>
                    <span className="font-medium text-foreground">
                      SQLite (Native Rusqlite &amp; WAL Mode)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Styling Framework</span>
                    <span className="font-medium text-foreground">
                      Tailwind CSS v4 &amp; Framer Motion
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenReleaseNotes?.()
                    }}
                    className="w-full justify-center gap-2 text-xs font-semibold hover:bg-muted cursor-pointer h-9 rounded-xl"
                  >
                    <Sparkles className="size-3.5 text-notes" />
                    What's New in v{APP_VERSION} (Release Notes)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
