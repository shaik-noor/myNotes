import { Check, ImageIcon, Link2, Smile, X } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import type { Note } from '../../../types/notes'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../ui/dialog'
import { cn } from '../../ui/utils'
import { BANNER_IMAGES_BY_CATEGORY, resolveCoverImage } from './bannerImages'

const COVER_GRADIENTS: { name: string; value: string }[] = [
  { name: 'Purple Horizon', value: 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500' },
  { name: 'Aurora', value: 'bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600' },
  { name: 'Sunset Glow', value: 'bg-gradient-to-r from-orange-400 via-pink-500 to-rose-500' },
  { name: 'Ocean Breeze', value: 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600' },
  { name: 'Deep Forest', value: 'bg-gradient-to-r from-emerald-800 to-teal-900' },
  { name: 'Crimson', value: 'bg-gradient-to-r from-red-500 to-amber-500' },
  { name: 'Slate', value: 'bg-slate-300 dark:bg-slate-800' }
]

const PRESET_EMOJIS = [
  '📝',
  '💻',
  '🚀',
  '💡',
  '📅',
  '🎯',
  '🎨',
  '🧪',
  '📁',
  '🔑',
  '📈',
  '💬',
  '⚠️',
  '✅',
  '❌',
  '📌',
  '🔒',
  '🌍',
  '🧠',
  '🏢',
  '⚡',
  '🔍',
  '🛠️',
  '📊'
]

interface CoverAndIconProps {
  note: Note
  onUpdate: (updates: Partial<Note>) => void
}

const CoverPickerDialog: React.FC<{
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (updates: Partial<Note>) => void
}> = ({ note, open, onOpenChange, onUpdate }) => {
  const [customUrl, setCustomUrl] = useState('')

  const pick = (coverImage: string): void => {
    onUpdate({ coverImage })
    onOpenChange(false)
  }

  const handleCustomSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (customUrl.trim()) {
      pick(customUrl.trim())
      setCustomUrl('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-h-[620px] w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl sm:max-w-[620px]">
        <DialogHeader className="shrink-0 space-y-0.5 border-b border-border/40 p-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <ImageIcon className="size-4 text-notes" />
            Choose cover
          </DialogTitle>
          <DialogDescription className="text-2xs text-muted-foreground">
            Pick a photo or gradient to set the banner for this note.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-6">
          {/* Custom URL */}
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Paste an image URL…"
                className="h-8 w-full rounded-lg border border-border/70 bg-background pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-notes/50"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={!customUrl.trim()}>
              Apply
            </Button>
          </form>

          {/* Gradients */}
          <div>
            <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Gradients
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {COVER_GRADIENTS.map((grad) => (
                <button
                  type="button"
                  key={grad.value}
                  onClick={() => pick(grad.value)}
                  className={cn(
                    'group relative h-12 rounded-lg border border-border/60 transition-all hover:scale-102 cursor-pointer overflow-hidden',
                    grad.value
                  )}
                  title={grad.name}
                >
                  {note.coverImage === grad.value && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                      <Check className="size-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Photos grouped by category */}
          {BANNER_IMAGES_BY_CATEGORY.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {group.images.map((img) => {
                  const resolved = resolveCoverImage(note.coverImage)
                  const isSelected =
                    note.coverImage === img.id ||
                    note.coverImage === img.url ||
                    resolved === img.url

                  return (
                    <button
                      type="button"
                      key={img.id}
                      onClick={() => pick(img.id)}
                      className="group relative aspect-video w-full rounded-lg border border-border/60 overflow-hidden transition-all hover:scale-102 cursor-pointer"
                    >
                      <img src={img.url} alt={img.name} className="size-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-3xs font-medium text-white truncate max-w-[90%]">
                        {img.name}
                      </span>
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-notes/30 text-white">
                          <Check className="size-5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const CoverBanner: React.FC<CoverAndIconProps> = ({ note, onUpdate }) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  if (!note.coverImage) return null

  const resolved = resolveCoverImage(note.coverImage)
  const isGradient = note.coverImage.startsWith('bg-')

  return (
    <div className="group/cover relative h-48 w-full overflow-hidden select-none">
      {isGradient ? (
        <div className={cn('size-full', note.coverImage)} />
      ) : (
        <img src={resolved} alt="Cover banner" className="size-full object-cover object-center" />
      )}

      {/* Hover action overlay */}
      <div className="absolute bottom-3 right-6 flex items-center gap-1.5 opacity-0 transition-opacity group-hover/cover:opacity-100">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPickerOpen(true)}
          className="h-7 bg-background/80 text-2xs backdrop-blur-md hover:bg-background shadow-xs"
        >
          <ImageIcon className="size-3 text-notes" />
          Change cover
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpdate({ coverImage: undefined })}
          className="h-7 bg-background/80 text-2xs backdrop-blur-md hover:bg-background shadow-xs"
          title="Remove cover"
        >
          <X className="size-3 text-destructive" />
        </Button>
      </div>

      <CoverPickerDialog
        note={note}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onUpdate={onUpdate}
      />
    </div>
  )
}

export const CoverAndIcon: React.FC<CoverAndIconProps> = ({ note, onUpdate }) => {
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [coverPickerOpen, setCoverPickerOpen] = useState(false)

  const hasIcon = Boolean(note.icon)
  const hasCover = Boolean(note.coverImage)

  return (
    <div className="relative mb-2">
      {/* Icon display or trigger button */}
      {hasIcon ? (
        <div className="group/icon relative inline-block">
          <button
            type="button"
            onClick={() => setIconPickerOpen(true)}
            className="flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-card text-3xl shadow-sm transition-transform hover:scale-105 cursor-pointer"
            title="Change icon"
          >
            {note.icon}
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ icon: undefined })}
            className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover/icon:opacity-100 shadow-xs cursor-pointer"
            title="Remove icon"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : null}

      {/* Hover buttons when icon/cover is missing */}
      {(!hasIcon || !hasCover) && (
        <div className="flex items-center gap-2 pt-1 opacity-0 transition-opacity group-hover/page:opacity-100">
          {!hasIcon && (
            <button
              type="button"
              onClick={() => setIconPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium text-muted-foreground/80 hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            >
              <Smile className="size-3.5" />
              Add icon
            </button>
          )}
          {!hasCover && (
            <button
              type="button"
              onClick={() => setCoverPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium text-muted-foreground/80 hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            >
              <ImageIcon className="size-3.5" />
              Add cover
            </button>
          )}
        </div>
      )}

      {/* Emoji picker dialog */}
      <Dialog open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
        <DialogContent className="max-w-xs p-4 rounded-2xl select-none">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-sm font-bold">Pick page icon</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_EMOJIS.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => {
                  onUpdate({ icon: emoji })
                  setIconPickerOpen(false)
                }}
                className="flex size-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cover picker modal */}
      <CoverPickerDialog
        note={note}
        open={coverPickerOpen}
        onOpenChange={setCoverPickerOpen}
        onUpdate={onUpdate}
      />
    </div>
  )
}
