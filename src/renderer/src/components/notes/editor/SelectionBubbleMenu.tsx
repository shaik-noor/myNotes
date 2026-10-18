import { toast } from '../../ui/toast'
import { type Editor, useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold,
  Code,
  FileOutput,
  Italic,
  Link as LinkIcon,
  Sparkles,
  Strikethrough,
  Underline as UnderlineIcon
} from 'lucide-react'
import type React from 'react'
import { useNotesStore } from '../../../store/useNotesStore'
import { OPEN_LINK_POPOVER_EVENT } from './editorExtensions'

interface SelectionBubbleMenuProps {
  editor: Editor
  currentNoteId: string | null
  onRewrite: () => void
}

const MarkButton: React.FC<{
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault()
      onClick()
    }}
    title={title}
    aria-label={title}
    className={`flex size-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
      active
        ? 'bg-notes/10 text-notes'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    {children}
  </button>
)

export const SelectionBubbleMenu: React.FC<SelectionBubbleMenuProps> = ({
  editor,
  currentNoteId,
  onRewrite
}) => {
  const active = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      code: ed.isActive('code'),
      link: ed.isActive('link')
    })
  })

  const handleTurnIntoPage = async (): Promise<void> => {
    const { from, to } = editor.state.selection
    const title = editor.state.doc.textBetween(from, to, ' ').trim()
    if (!title) {
      toast.error('No text selected', { description: 'Select text to turn into a page.' })
      return
    }
    if (!currentNoteId) {
      toast.error('Cannot create child page', { description: 'No parent note is open.' })
      return
    }

    try {
      const newId = await useNotesStore.getState().createLinkedChildPage(title, currentNoteId)
      const href = `mynotes:${newId}`
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent([
          {
            type: 'text',
            text: title,
            marks: [{ type: 'link', attrs: { href } }]
          },
          { type: 'text', text: ' ' }
        ])
        .run()
      toast.success('Page created', { description: `"${title}" is now a linked sub-page.` })
    } catch (error) {
      console.error('Failed to create linked child page:', error)
      toast.error('Failed to create page', {
        description: 'An error occurred while creating the sub-page.'
      })
    }
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top' }}
      shouldShow={({ editor: ed, from, to }) => {
        if (from === to) return false
        if (ed.isActive('codeBlock')) return false
        return true
      }}
    >
      <div className="rounded-xl border border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 text-popover-foreground">
        <div className="flex items-center gap-0.5">
          <MarkButton
            active={active.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="size-3.5" />
          </MarkButton>
          <MarkButton
            active={active.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="size-3.5" />
          </MarkButton>
          <MarkButton
            active={active.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="size-3.5" />
          </MarkButton>
          <MarkButton
            active={active.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </MarkButton>
          <MarkButton
            active={active.code}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            <Code className="size-3.5" />
          </MarkButton>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          <MarkButton
            active={active.link}
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_LINK_POPOVER_EVENT))}
            title="Link (Ctrl+K)"
          >
            <LinkIcon className="size-3.5" />
          </MarkButton>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          <MarkButton
            active={false}
            onClick={() => {
              void handleTurnIntoPage()
            }}
            title="Turn into linked sub-page"
          >
            <FileOutput className="size-3.5" />
          </MarkButton>

          <div className="mx-0.5 h-4 w-px bg-border/60" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onRewrite()
            }}
            className="flex h-7 items-center gap-1.5 rounded-md bg-notes/10 px-2.5 text-xs font-medium text-notes transition-colors hover:bg-notes/20 cursor-pointer"
            title="Improve writing with AI"
          >
            <Sparkles className="size-3.5" />
            Improve writing
          </button>
        </div>
      </div>
    </BubbleMenu>
  )
}

