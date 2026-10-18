import type { Editor } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export type AiGhostMode = 'insert' | 'replace'

interface AiGhostState {
  from: number
  to: number
  mode: AiGhostMode
  text: string
  isStreaming: boolean
}

type AiGhostMeta =
  | { type: 'start'; from: number; to: number; mode: AiGhostMode }
  | { type: 'setText'; text: string }
  | { type: 'streaming'; isStreaming: boolean }
  | { type: 'stop' }

const aiGhostPluginKey = new PluginKey<AiGhostState | null>('aiGhost')

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiGhost: {
      startAiGhost: (opts: { from: number; to: number; mode: AiGhostMode }) => ReturnType
      setAiGhostText: (text: string) => ReturnType
      setAiGhostStreaming: (isStreaming: boolean) => ReturnType
      stopAiGhost: () => ReturnType
    }
  }
}

export const AiGhost = Extension.create({
  name: 'aiGhost',

  addProseMirrorPlugins() {
    return [
      new Plugin<AiGhostState | null>({
        key: aiGhostPluginKey,
        state: {
          init(): AiGhostState | null {
            return null
          },
          apply(tr, value): AiGhostState | null {
            if (value) {
              const mapped = tr.mapping.mapResult(value.from)
              const mappedTo = tr.mapping.mapResult(value.to)
              if (mapped.deleted || mappedTo.deleted) return null
              value = { ...value, from: mapped.pos, to: mappedTo.pos }
            }

            const meta = tr.getMeta(aiGhostPluginKey) as AiGhostMeta | undefined
            if (!meta) return value
            switch (meta.type) {
              case 'start':
                return {
                  from: meta.from,
                  to: meta.to,
                  mode: meta.mode,
                  text: '',
                  isStreaming: true
                }
              case 'setText':
                return value ? { ...value, text: meta.text } : null
              case 'streaming':
                return value ? { ...value, isStreaming: meta.isStreaming } : null
              case 'stop':
                return null
              default:
                return value
            }
          }
        },
        props: {
          decorations(state) {
            const ghostState = aiGhostPluginKey.getState(state)
            if (!ghostState) return DecorationSet.empty

            const { from, to, text, mode, isStreaming } = ghostState
            const decos: Decoration[] = []

            if (mode === 'replace' && from < to) {
              decos.push(Decoration.inline(from, to, { class: 'mydesk-ai-ghost-target' }))
            }

            if (text || isStreaming) {
              const widget = document.createElement('span')
              widget.className = isStreaming ? 'mydesk-ai-ghost is-streaming' : 'mydesk-ai-ghost'
              if (text) widget.appendChild(document.createTextNode(text))
              if (isStreaming) {
                const caret = document.createElement('span')
                caret.className = 'mydesk-ai-ghost-caret'
                widget.appendChild(caret)
              }
              decos.push(Decoration.widget(to, widget, { side: 1 }))
            }

            return DecorationSet.create(state.doc, decos)
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      startAiGhost:
        (opts: { from: number; to: number; mode: AiGhostMode }) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(aiGhostPluginKey, { type: 'start', ...opts } satisfies AiGhostMeta)
            dispatch(tr)
          }
          return true
        },
      setAiGhostText:
        (text: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(aiGhostPluginKey, { type: 'setText', text } satisfies AiGhostMeta)
            dispatch(tr)
          }
          return true
        },
      setAiGhostStreaming:
        (isStreaming: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(aiGhostPluginKey, { type: 'streaming', isStreaming } satisfies AiGhostMeta)
            dispatch(tr)
          }
          return true
        },
      stopAiGhost:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(aiGhostPluginKey, { type: 'stop' } satisfies AiGhostMeta)
            dispatch(tr)
          }
          return true
        }
    }
  }
})

export function getAiGhostRange(
  editor: Editor
): { from: number; to: number; mode: AiGhostMode } | null {
  const state = aiGhostPluginKey.getState(editor.state)
  if (!state) return null
  return { from: state.from, to: state.to, mode: state.mode }
}
