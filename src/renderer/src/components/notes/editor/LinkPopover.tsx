import type { Editor } from '@tiptap/react'
import { Check, ExternalLink, Link as LinkIcon, Trash2 } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover'
import { OPEN_LINK_POPOVER_EVENT } from './editorExtensions'

interface LinkPopoverProps {
  editor: Editor
}

/**
 * In-app link editor.
 */
export const LinkPopover: React.FC<LinkPopoverProps> = ({ editor }) => {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const openForSelection = (): void => {
    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    setRect(
      new DOMRect(
        Math.min(start.left, end.left),
        start.top,
        Math.abs(end.right - start.left),
        end.bottom - start.top
      )
    )
    setUrl(editor.getAttributes('link').href || '')
    setOpen(true)
  }

  useEffect(() => {
    const handler = (): void => openForSelection()
    window.addEventListener(OPEN_LINK_POPOVER_EVENT, handler)
    return () => window.removeEventListener(OPEN_LINK_POPOVER_EVENT, handler)
  }, [editor])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const apply = (): void => {
    const trimmed = url.trim()
    if (trimmed) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setOpen(false)
  }

  const remove = (): void => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setOpen(false)
  }

  const hasLink = editor.isActive('link')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          style={{
            position: 'fixed',
            left: rect ? rect.left + rect.width / 2 : 0,
            top: rect ? rect.top : 0,
            width: 1,
            height: rect ? rect.height : 0
          }}
        />
      </PopoverAnchor>
      <PopoverContent align="center" side="bottom" className="w-80 p-2">
        <div className="flex items-center gap-1.5">
          <LinkIcon className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                apply()
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder="Paste or type a URL…"
            className="min-w-0 flex-1 bg-transparent px-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          {hasLink && url.trim() && (
            <button
              type="button"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              title="Open link"
              aria-label="Open link"
            >
              <ExternalLink className="size-3.5" />
            </button>
          )}
          {hasLink && (
            <button
              type="button"
              onClick={remove}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Remove link"
              aria-label="Remove link"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <Button
            size="icon-xs"
            onClick={apply}
            className="shrink-0 cursor-pointer"
            title="Apply"
            aria-label="Apply"
          >
            <Check className="size-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
