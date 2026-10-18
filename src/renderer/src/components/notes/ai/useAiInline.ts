import { toast } from '../../ui/toast'
import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type AiGhostMode, getAiGhostRange } from '../editor/aiGhost'
import { AI_SYSTEM_PROMPT, buildRewritePrompt, REWRITE_LABEL, stripCodeFences } from './aiActions'

export type AiInlinePhase = 'idle' | 'streaming' | 'ready' | 'error'

export interface AiInlineState {
  phase: AiInlinePhase
  actionLabel: string
  anchor: { x: number; y: number } | null
}

const IDLE: AiInlineState = { phase: 'idle', actionLabel: '', anchor: null }

interface MarkdownStorage {
  getMarkdown: () => string
  serializer: { serialize: (node: unknown) => string }
}

function md(editor: Editor): MarkdownStorage | undefined {
  return (editor.storage as unknown as Record<string, unknown>).markdown as
    | MarkdownStorage
    | undefined
}

function selectionMarkdown(editor: Editor): string {
  const { from, to } = editor.state.selection
  const slice = editor.state.selection.content()
  const docNode = editor.schema.topNodeType.create(null, slice.content)
  return md(editor)?.serializer.serialize(docNode) ?? editor.state.doc.textBetween(from, to)
}

interface Target {
  from: number
  to: number
  mode: AiGhostMode
}

interface PendingRequest {
  label: string
  systemPrompt: string
  userPrompt: string
}

export function useAiInline(model: string): {
  state: AiInlineState
  rewrite: (editor: Editor) => Promise<void>
  accept: (editor: Editor) => void
  reject: (editor: Editor) => void
  regenerate: (editor: Editor) => Promise<void>
  stop: () => void
} {
  const [state, setState] = useState<AiInlineState>(IDLE)

  const editorRef = useRef<Editor | null>(null)
  const targetRef = useRef<Target | null>(null)
  const requestRef = useRef<PendingRequest | null>(null)
  const resultRef = useRef<string>('')
  const streamIdRef = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const frameRef = useRef<number | null>(null)

  const computeAnchor = useCallback((editor: Editor): { x: number; y: number } | null => {
    const dom = editor.view.dom as HTMLElement
    const ghostEl = dom.querySelector('.mydesk-ai-ghost, .mynotes-ai-ghost')
    if (ghostEl) {
      const r = ghostEl.getBoundingClientRect()
      return { x: r.left, y: r.bottom }
    }
    const range = getAiGhostRange(editor)
    if (range) {
      const c = editor.view.coordsAtPos(range.to)
      return { x: c.left, y: c.bottom }
    }
    return null
  }, [])

  const cancelFrame = useCallback((): void => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const teardownStream = useCallback((): void => {
    const id = streamIdRef.current
    if (id) window.api.ai.cancelStream(id).catch(() => {})
    streamIdRef.current = null
    unsubRef.current?.()
    unsubRef.current = null
    cancelFrame()
  }, [cancelFrame])

  const clearGhost = useCallback((editor: Editor | null): void => {
    if (!editor || editor.isDestroyed) return
    editor.commands.stopAiGhost()
    editor.setEditable(true)
  }, [])

  const streamInto = useCallback(
    async (editor: Editor, req: PendingRequest): Promise<void> => {
      const randomBytes = new Uint8Array(8)
      crypto.getRandomValues(randomBytes)
      const randomHex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')
      const streamId = `stream_${Date.now()}_${randomHex}`
      streamIdRef.current = streamId
      resultRef.current = ''
      let liveText = ''

      setState({ phase: 'streaming', actionLabel: req.label, anchor: computeAnchor(editor) })

      const pushUpdate = (): void => {
        if (frameRef.current !== null) return
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null
          if (editor.isDestroyed) return
          editor.commands.setAiGhostText(liveText)
          setState((s) => (s.phase === 'streaming' ? { ...s, anchor: computeAnchor(editor) } : s))
        })
      }

      const unsubscribe = window.api.ai.onStreamEvent(streamId, (evt) => {
        if (streamIdRef.current !== streamId) return
        if (evt.type === 'chunk') {
          if (evt.accumulated !== undefined) {
            liveText = evt.accumulated
          } else if (evt.text) {
            liveText += evt.text
          }
          pushUpdate()
        } else if (evt.type === 'done' && evt.text) {
          liveText = evt.text
          pushUpdate()
        }
      })
      unsubRef.current = unsubscribe

      let res: { success: boolean; error?: string }
      try {
        res = await window.api.ai.chatCompletionStream(streamId, req.systemPrompt, [
          { role: 'user', content: req.userPrompt }
        ])
      } catch (e) {
        res = { success: false, error: e instanceof Error ? e.message : String(e) }
      }

      unsubscribe()

      if (streamIdRef.current !== streamId) return

      unsubRef.current = null
      streamIdRef.current = null
      cancelFrame()
      if (!editor.isDestroyed) editor.commands.setAiGhostText(liveText)

      const finalText = stripCodeFences(liveText)
      if ((res.success || liveText.trim()) && finalText.trim()) {
        resultRef.current = finalText
        if (!editor.isDestroyed) editor.commands.setAiGhostStreaming(false)
        setState((s) => ({ ...s, phase: 'ready', anchor: computeAnchor(editor) }))
      } else {
        clearGhost(editor)
        targetRef.current = null
        requestRef.current = null
        setState(IDLE)
        if (!res.success) {
          toast.error('AI generation failed', { description: res.error || 'No content was generated.' })
        }
      }
    },
    [model, computeAnchor, cancelFrame, clearGhost]
  )

  const rewrite = useCallback(
    async (editor: Editor): Promise<void> => {
      teardownStream()
      clearGhost(editorRef.current)

      const { from, to, empty } = editor.state.selection
      if (empty || from === to) {
        toast.error('Nothing to work with', { description: 'Select some text first.' })
        return
      }

      editorRef.current = editor
      targetRef.current = { from, to, mode: 'replace' }
      const req: PendingRequest = {
        label: REWRITE_LABEL,
        systemPrompt: AI_SYSTEM_PROMPT,
        userPrompt: buildRewritePrompt(selectionMarkdown(editor))
      }
      requestRef.current = req

      editor.commands.startAiGhost({ from, to, mode: 'replace' })
      editor.setEditable(false)
      await streamInto(editor, req)
    },
    [teardownStream, clearGhost, streamInto]
  )

  const accept = useCallback(
    (editor: Editor): void => {
      const result = resultRef.current
      const target = targetRef.current
      if (!result || !target) {
        clearGhost(editor)
        setState(IDLE)
        return
      }
      const range = getAiGhostRange(editor) ?? {
        from: target.from,
        to: target.to,
        mode: target.mode
      }
      clearGhost(editor)

      if (range.mode === 'replace' && range.from < range.to) {
        editor.chain().focus().insertContentAt({ from: range.from, to: range.to }, result).run()
      } else {
        editor.chain().focus().insertContentAt(range.from, result).run()
      }

      targetRef.current = null
      requestRef.current = null
      resultRef.current = ''
      setState(IDLE)
    },
    [clearGhost]
  )

  const reject = useCallback(
    (editor: Editor): void => {
      teardownStream()
      clearGhost(editor)
      targetRef.current = null
      requestRef.current = null
      resultRef.current = ''
      setState(IDLE)
    },
    [teardownStream, clearGhost]
  )

  const regenerate = useCallback(
    async (editor: Editor): Promise<void> => {
      const req = requestRef.current
      if (!req) return
      teardownStream()
      editor.commands.setAiGhostText('')
      editor.commands.setAiGhostStreaming(true)
      await streamInto(editor, req)
    },
    [teardownStream, streamInto]
  )

  const stop = useCallback((): void => {
    const id = streamIdRef.current
    if (id) window.api.ai.cancelStream(id).catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      teardownStream()
      const editor = editorRef.current
      if (editor && !editor.isDestroyed) {
        editor.commands.stopAiGhost()
        editor.setEditable(true)
      }
    }
  }, [teardownStream])

  return { state, rewrite, accept, reject, regenerate, stop }
}
