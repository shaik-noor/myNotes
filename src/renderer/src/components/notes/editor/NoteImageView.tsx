import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import { ImageOff, Loader2 } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { attachmentIdFromUrl, NoteAttachmentsService } from '../../../services/noteAttachments'

export const NoteImageView: React.FC<NodeViewProps> = ({ node, selected }) => {
  const rawSrc: string = node.attrs.src ?? ''
  const alt: string = node.attrs.alt ?? ''
  const attachmentId = attachmentIdFromUrl(rawSrc)

  const [resolved, setResolved] = useState<string | null>(attachmentId ? null : rawSrc)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!attachmentId) {
      setResolved(rawSrc)
      return
    }
    let cancelled = false
    setResolved(null)
    setFailed(false)
    NoteAttachmentsService.getAttachmentDataUrl(attachmentId)
      .then((res) => {
        if (cancelled) return
        if (res?.dataUrl) setResolved(res.dataUrl)
        else setFailed(true)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [attachmentId, rawSrc])

  return (
    <NodeViewWrapper as="div" className="relative my-4" data-drag-handle>
      {failed ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <ImageOff className="size-4 shrink-0" />
          <span className="truncate">Image unavailable{alt ? ` — ${alt}` : ''}</span>
        </div>
      ) : resolved ? (
        <img
          src={resolved}
          alt={alt}
          className={selected ? 'ProseMirror-selectednode' : undefined}
        />
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-border/40 bg-muted/30 py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </NodeViewWrapper>
  )
}
