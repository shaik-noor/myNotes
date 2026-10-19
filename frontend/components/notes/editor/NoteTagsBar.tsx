import { Hash, Plus, X } from 'lucide-react'
import type React from 'react'
import { useRef, useState } from 'react'

interface NoteTagsBarProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export const NoteTagsBar: React.FC<NoteTagsBarProps> = ({ tags, onChange }) => {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const canceledRef = useRef(false)

  const commit = (): void => {
    setAdding(false)
    if (canceledRef.current) {
      canceledRef.current = false
      setDraft('')
      return
    }
    const t = draft.trim().toLowerCase()
    setDraft('')
    if (!t) return
    if (tags.includes(t)) return
    onChange([...tags, t])
  }

  const cancel = (): void => {
    canceledRef.current = true
    setDraft('')
    setAdding(false)
  }

  const remove = (tag: string): void => {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group/tag inline-flex items-center gap-0.5 rounded-full border border-notes/25 bg-notes/8 py-0.5 pr-1 pl-1.5 text-2xs font-medium text-notes"
        >
          <Hash className="size-2.5 opacity-70" />
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="ml-0.5 flex size-3.5 cursor-pointer items-center justify-center rounded-full opacity-50 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100 group-hover/tag:opacity-100"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancel()
              e.currentTarget.blur()
            }
          }}
          placeholder="tag…"
          maxLength={32}
          aria-label="New tag"
          className="h-5 w-24 rounded-full border border-notes/40 bg-background px-2 text-2xs outline-none focus-visible:ring-1 focus-visible:ring-notes/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-border/70 px-2 py-0.5 text-2xs font-medium text-muted-foreground/80 transition-colors hover:border-notes/50 hover:text-notes"
          aria-label="Add a tag"
        >
          <Plus className="size-2.5" />
          {tags.length === 0 ? 'Add tag' : 'Tag'}
        </button>
      )}
    </div>
  )
}
