import type { NoteAttachment } from '../../../types/notes'
import type { EditorView } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/react'
import { NOTE_ATTACHMENT_SCHEME } from '../../../services/noteAttachments'

/** True for an attachment we render inline as an image. */
function isImage(att: NoteAttachment): boolean {
  return att.kind === 'image'
}

/** Insert via the high-level Editor chain (slash command / menu). */
export function insertAttachmentWithEditor(editor: Editor, att: NoteAttachment): void {
  if (!att.id) return
  const href = `${NOTE_ATTACHMENT_SCHEME}${att.id}`
  if (isImage(att)) {
    editor.chain().focus().setImage({ src: href, alt: att.name }).run()
    return
  }
  editor
    .chain()
    .focus()
    .insertContent([
      { type: 'text', text: att.name, marks: [{ type: 'link', attrs: { href } }] },
      { type: 'text', text: ' ' }
    ])
    .run()
}

/** Insert via a raw ProseMirror view (paste/drop handlers). */
export function insertAttachmentIntoView(view: EditorView, att: NoteAttachment): void {
  if (!att.id || !view.state) return
  const href = `${NOTE_ATTACHMENT_SCHEME}${att.id}`
  const { schema, tr } = view.state
  if (isImage(att)) {
    const imageType = schema.nodes.image
    if (!imageType) return
    view.dispatch(tr.replaceSelectionWith(imageType.create({ src: href, alt: att.name })))
    return
  }
  const linkMark = schema.marks.link
  const textNode = schema.text(att.name, linkMark ? [linkMark.create({ href })] : [])
  view.dispatch(tr.replaceSelectionWith(textNode).scrollIntoView())
}
