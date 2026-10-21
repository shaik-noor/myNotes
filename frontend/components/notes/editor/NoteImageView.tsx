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
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)

  useEffect(() => {
    setFailed(false)
    setLoadedSrc(null)
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

  const loading = !failed && (!resolved || loadedSrc !== resolved)

  return (
    <NodeViewWrapper as="div" className="relative my-4" data-drag-handle>
      {failed ? (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <ImageOff className="size-4 shrink-0" />
          <span className="truncate">Image unavailable{alt ? ` — ${alt}` : ''}</span>
        </div>
      ) : (
        <div className={loading ? 'relative min-h-24' : 'relative'} aria-busy={loading}>
          {resolved && (
            <img
              src={resolved}
              alt={alt}
              onLoad={() => setLoadedSrc(resolved)}
              onError={() => setFailed(true)}
              className={`editor-image ${loadedSrc === resolved ? 'is-loaded' : ''} ${selected ? 'ProseMirror-selectednode' : ''}`}
            />
          )}
          {loading && (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center rounded-lg border border-border/40 bg-muted/30"
            >
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading image</span>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  )
}
