import { generateJSON } from '@tiptap/core'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { type Editor, EditorContent, useEditor } from '@tiptap/react'
import { GripVertical } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ContextMenu, ContextMenuTrigger } from '../../ui/context-menu'
import { buildEditorExtensions } from './editorExtensions'
import { buildNotesEditorProps } from './editorProps'
import { LinkPopover } from './LinkPopover'
import { decodeHtmlEntities, looksLikeLegacyHtml } from './legacyHtmlDetect'
import { SelectionBubbleMenu } from './SelectionBubbleMenu'
import { TableControls } from './TableControls'
import { TableHoverControls } from './TableHoverControls'

function getMarkdown(editor: Editor): string {
  const storage = (editor.storage as unknown as Record<string, unknown>).markdown as
    | { getMarkdown: () => string }
    | undefined
  return storage?.getMarkdown() ?? ''
}

function applyContent(editor: Editor, content: string): void {
  let normalized = content
  if (/^\s*\\?\[table\]\s*$/i.test(normalized.trim())) {
    normalized = '|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n'
  } else if (/\\?\[table\]/i.test(normalized)) {
    normalized = normalized.replace(
      /(?:^|\n)\s*\\?\[table\]\s*(?:\n|$)/gi,
      '\n\n|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n\n'
    )
  }

  if (looksLikeLegacyHtml(normalized)) {
    try {
      const json = generateJSON(decodeHtmlEntities(normalized), editor.extensionManager.extensions)
      editor.commands.setContent(json, { emitUpdate: false })
      return
    } catch {
      /* fall through to markdown parse */
    }
  }
  editor.commands.setContent(normalized, { emitUpdate: false })
}

interface NotesEditorProps {
  content: string
  noteId: string
  fontClass: string
  onEditorReady: (editor: Editor | null) => void
  onChange: (markdown: string) => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  content,
  noteId,
  fontClass,
  onEditorReady,
  onChange,
  onContextMenu
}) => {
  const lastAppliedMdRef = useRef<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  const extensions = useMemo(() => buildEditorExtensions(noteId), [noteId])
  const editor = useEditor({
    shouldRerenderOnTransaction: false,
    extensions,
    content: '',
    editorProps: {
      ...buildNotesEditorProps(noteId),
      attributes: {
        class: 'tiptap focus:outline-none',
        role: 'textbox',
        'aria-label': 'Page content',
        'aria-multiline': 'true'
      }
    },
    onUpdate: ({ editor }) => {
      const md = getMarkdown(editor)
      lastAppliedMdRef.current = md
      onChange(md)
    }
  })

  useEffect(() => {
    onEditorReady(editor && !editor.isDestroyed ? editor : null)
    return () => onEditorReady(null)
  }, [editor, onEditorReady])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (content === lastAppliedMdRef.current) return
    const hadFocus = editor.isFocused
    const { from, to } = editor.state.selection
    applyContent(editor, content)
    lastAppliedMdRef.current = getMarkdown(editor)
    if (hadFocus) {
      const size = editor.state.doc.content.size
      editor.commands.setTextSelection({
        from: Math.min(from, size),
        to: Math.min(to, size)
      })
    }
  }, [editor, content])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent): void => {
      if (editor?.isActive('table')) return
      e.preventDefault()
      onContextMenu?.(e)
    },
    [editor, onContextMenu]
  )

  if (!editor || editor.isDestroyed) return null

  return (
    <div ref={containerRef} className={`relative ${fontClass}`}>
      <ContextMenu>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
          <EditorContent editor={editor} />
        </ContextMenuTrigger>
        <TableControls editor={editor} />
      </ContextMenu>

      <TableHoverControls editor={editor} containerRef={containerRef} />

      <SelectionBubbleMenu editor={editor} currentNoteId={noteId} />
      <LinkPopover editor={editor} />

      <DragHandle editor={editor}>
        <div className="mydesk-drag-handle">
          <GripVertical className="size-4" />
        </div>
      </DragHandle>
    </div>
  )
}
