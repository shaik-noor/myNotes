import { toast } from '../../ui/toast'
import type { EditorProps, EditorView } from '@tiptap/pm/view'
import { useNotesStore } from '../../../store/useNotesStore'
import { attachmentIdFromUrl, NoteAttachmentsService } from '../../../services/noteAttachments'
import { emitNoteAttachmentsChanged } from './attachmentEvents'
import { insertAttachmentIntoView } from './attachmentInsert'
import { handleTableCopy } from './clipboardHtml'
import { sliceToPlainText } from './clipboardText'

export const OPEN_PAGE_PEEK_EVENT = 'notes:open-page-peek'

async function attachAndInsertFile(view: EditorView, noteId: string, file: File): Promise<void> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const att = await NoteAttachmentsService.attachBytes(noteId, file.name || 'file', bytes)
    if (!att) {
      toast.error(`Could not attach ${file.name}`)
      return
    }
    if (att.error) {
      toast.error(`Could not attach ${file.name}`, { description: att.error })
      return
    }
    insertAttachmentIntoView(view, att)
    emitNoteAttachmentsChanged(noteId)
  } catch (e) {
    toast.error('Could not attach file', {
      description: e instanceof Error ? e.message : String(e)
    })
  }
}

export function buildNotesEditorProps(noteId: string): EditorProps {
  return {
    clipboardTextSerializer: (slice) => sliceToPlainText(slice),

    handleDOMEvents: {
      copy: handleTableCopy,
      cut: handleTableCopy
    },

    handlePaste(view, event) {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((f): f is File => !!f)
      if (files.length === 0) return false
      for (const file of files) void attachAndInsertFile(view, noteId, file)
      return true
    },

    handleDrop(view, event, _slice, moved) {
      if (moved) return false
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (files.length === 0) return false
      event.preventDefault()
      for (const file of files) void attachAndInsertFile(view, noteId, file)
      return true
    },

    handleClickOn(_view, _pos, _node, _nodePos, event) {
      const target = event.target as HTMLElement
      if (target.tagName === 'A' && target instanceof HTMLAnchorElement) {
        const href = target.getAttribute('href')
        if (href?.startsWith('mynotes:') || href?.startsWith('mydesk-note:')) {
          event.preventDefault()
          const targetId = href.startsWith('mynotes:')
            ? href.replace('mynotes:', '')
            : href.replace('mydesk-note:', '')
          const store = useNotesStore.getState()
          const targetNote = store.notes.find((n) => n.id === targetId)
          if (targetNote) {
            window.dispatchEvent(
              new CustomEvent(OPEN_PAGE_PEEK_EVENT, { detail: { noteId: targetId } })
            )
          } else {
            toast.error('Linked page not found')
            target.classList.add('page-link--broken')
          }
          return true
        }
        const attachmentId = attachmentIdFromUrl(href)
        if (attachmentId) {
          event.preventDefault()
          void NoteAttachmentsService.open(attachmentId).then((ok) => {
            if (!ok) toast.error('Could not open attachment')
          })
          return true
        }
      }
      return false
    }
  }
}
