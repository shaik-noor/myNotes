import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { confirmDialog } from './ui/confirm'
import { toast } from './ui/toast'
import { cn } from './ui/utils'
import {
  Check,
  DatabaseBackup,
  Download,
  Info,
  Laptop,
  Moon,
  Palette,
  Sun,
  Upload
} from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useNotesStore } from '../store/useNotesStore'
import type { EditorFont, Palette as PaletteType, ThemeMode } from '../types/notes'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = 'appearance' | 'data' | 'about'

const PALETTES: { id: PaletteType; label: string; description: string; swatch: string }[] = [
  { id: 'blue', label: 'Default Ocean', description: 'Clean Slate & Blue', swatch: '#3b82f6' },
  { id: 'amber', label: 'Warm Amber', description: 'Cozy Glow & Warmth', swatch: '#f59e0b' },
  { id: 'violet', label: 'Deep Violet', description: 'Royal Lavender & Purple', swatch: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald Forest', description: 'Serene Nature & Green', swatch: '#10b981' },
  { id: 'rose', label: 'Soft Rose', description: 'Modern Blush & Coral', swatch: '#f43f5e' }
]

const FONTS: { id: EditorFont; label: string; sample: string; className: string }[] = [
  { id: 'font-sans-editor', label: 'Inter Sans', sample: 'The quick brown fox jumps over the lazy dog.', className: 'font-sans-editor' },
  { id: 'font-serif-editor', label: 'Lora Serif', sample: 'The quick brown fox jumps over the lazy dog.', className: 'font-serif-editor' },
  { id: 'font-mono-editor', label: 'JetBrains Mono', sample: 'The quick brown fox jumps over the lazy dog.', className: 'font-mono-editor' }
]

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const { theme, setTheme, palette, setPalette, fontClass, setFontClass } = useTheme()
  const loadNotes = useNotesStore((s) => s.loadNotes)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleBackup = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const res = await window.api.storage.backup()
      if (res.success && res.data) {
        toast.success('Backup created successfully', { description: res.data })
      } else {
        toast.error('Backup failed', { description: res.error || 'Could not export database backup' })
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
      description: 'Restoring will merge or overwrite existing notes from the chosen backup archive.',
      confirmText: 'Choose Backup File…'
    })
    if (!ok) return

    setIsImporting(true)
    try {
      const res = await window.api.storage.restore()
      if (res.success) {
        await loadNotes()
        toast.success('Backup restored successfully', { description: 'Your notes and attachments have been reloaded.' })
      } else if (res.error !== 'Restore canceled') {
        toast.error('Restore failed', { description: res.error || 'Could not restore backup' })
      }
    } catch (e: unknown) {
      toast.error('Restore error', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(85vh,640px)] w-[94vw] sm:w-[780px] max-w-[94vw] sm:max-w-[780px] flex-col gap-0 overflow-hidden p-0 rounded-2xl border border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl text-foreground">
        <DialogHeader className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your myNotes appearance, data and backup preferences.</DialogDescription>
        </DialogHeader>

        <div className="flex h-full min-h-0 flex-1">
          {/* Sidebar Tabs */}
          <div className="w-52 shrink-0 border-r border-border/40 bg-sidebar/50 p-3 flex flex-col gap-1">
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
                  <p className="text-xs text-muted-foreground mt-0.5">Select your preferred window theme.</p>
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
                  <p className="text-xs text-muted-foreground mt-0.5">Choose an accent color tone for icons, active tabs and highlights.</p>
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
                  <p className="text-xs text-muted-foreground mt-0.5">Customize font family used across note writing canvases.</p>
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
                            <div className={cn('text-xs text-muted-foreground mt-0.5', f.className)}>
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

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Local Database Storage</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your notes, trees, links, and attachments are saved locally on this machine using SQLite.
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
                        Creates a portable, JSON-packaged backup of your entire library including all markdown notes and file attachments.
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
                      <h4 className="text-xs font-bold text-foreground">Restore from Backup Archive</h4>
                      <p className="text-2xs text-muted-foreground mt-0.5">
                        Import notes and attachments from a previously exported <code className="text-2xs bg-muted px-1 rounded">.json</code> backup archive.
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
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-notes/10 text-notes font-bold text-xl border border-notes/30">
                    N
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">myNotes</h3>
                    <p className="text-xs text-muted-foreground">Version 1.0.0 (Production Desktop)</p>
                    <p className="text-2xs text-muted-foreground mt-1">Standalone note-taking workspace with Notion-grade polish.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 divide-y divide-border/30 text-xs bg-muted/20">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Platform</span>
                    <span className="font-medium text-foreground">macOS Apple Silicon &amp; Cross-Platform</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Editor Engine</span>
                    <span className="font-medium text-foreground">TipTap v3 &amp; ProseMirror</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Storage Engine</span>
                    <span className="font-medium text-foreground">SQLite (better-sqlite3)</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-muted-foreground">Styling Framework</span>
                    <span className="font-medium text-foreground">Tailwind CSS v4 &amp; Framer Motion</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
