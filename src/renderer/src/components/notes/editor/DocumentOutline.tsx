import { type Editor, useEditorState } from '@tiptap/react'
import { ListTree, X } from 'lucide-react'
import type React from 'react'

interface OutlineHeading {
  level: number
  text: string
  pos: number
}

interface DocumentOutlineProps {
  editor: Editor
  onClose: () => void
}

/**
 * The "On this page" outline (table of contents) derived from the note's headings.
 */
export const DocumentOutline: React.FC<DocumentOutlineProps> = ({ editor, onClose }) => {
  const headings = useEditorState({
    editor,
    selector: ({ editor }): OutlineHeading[] => {
      const items: OutlineHeading[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({ level: node.attrs.level as number, text: node.textContent, pos })
        }
      })
      return items
    }
  })

  const jumpTo = (pos: number): void => {
    try {
      const target = Math.min(pos + 1, editor.state.doc.content.size)
      editor.chain().focus().setTextSelection(target).run()
      const dom = editor.view.domAtPos(target).node as HTMLElement
      const el = dom.nodeType === 1 ? dom : dom.parentElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      /* stale outline entry — ignore */
    }
  }

  const header = (
    <div className="flex items-center justify-between gap-2 pb-1 pl-2 pt-0.5">
      <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        On this page
      </span>
      <button
        type="button"
        onClick={onClose}
        title="Close"
        aria-label="Close On this page"
        className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )

  if (!headings || headings.length === 0) {
    return (
      <div className="flex flex-col p-2">
        {header}
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <ListTree className="size-6 text-muted-foreground/30" />
          <span className="text-2xs text-muted-foreground/70">
            Add headings to build an outline.
          </span>
        </div>
      </div>
    )
  }

  return (
    <nav aria-label="On this page" className="flex flex-col gap-0.5 p-2">
      {header}
      {headings.map((h, i) => (
        <button
          type="button"
          key={i}
          onClick={() => jumpTo(h.pos)}
          style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
          className="truncate rounded-lg py-1.5 pr-2 text-left text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer select-none"
          title={h.text}
        >
          {h.text || 'Untitled heading'}
        </button>
      ))}
    </nav>
  )
}
