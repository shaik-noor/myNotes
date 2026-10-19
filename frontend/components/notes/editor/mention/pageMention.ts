import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { useNotesStore } from '../../../../store/useNotesStore'
import { type PageMentionHandle, PageMentionMenu, type PageMentionProps } from './PageMentionMenu'

export interface PageSuggestion {
  id: string
  title: string
  icon: string | null
}

/**
 * `@`-mention autocomplete for page links. Uses `@tiptap/suggestion`.
 */
export const PageMention = Extension.create({
  name: 'pageMention',

  addProseMirrorPlugins() {
    return [
      Suggestion<PageSuggestion, PageSuggestion>({
        pluginKey: new PluginKey('pageMention'),
        editor: this.editor,
        char: '@',
        allowSpaces: false,
        command: ({ editor, range, props }) => {
          const label = props.title
          const href = `mynotes:${props.id}`
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'text',
                text: label,
                marks: [{ type: 'link', attrs: { href } }]
              },
              { type: 'text', text: ' ' }
            ])
            .run()
        },
        items: ({ query }) => {
          const state = useNotesStore.getState()
          const notes = state.notes
          const currentNoteId = state.selectedNoteId

          const q = query.trim().toLowerCase()
          const filtered = notes.filter((n) => {
            if (currentNoteId && n.id === currentNoteId) return false
            return (n.title || 'Untitled').toLowerCase().includes(q)
          })

          filtered.sort((a, b) => {
            const aTitle = (a.title || 'Untitled').toLowerCase()
            const bTitle = (b.title || 'Untitled').toLowerCase()
            const aStarts = aTitle.startsWith(q)
            const bStarts = bTitle.startsWith(q)
            if (aStarts && !bStarts) return -1
            if (!aStarts && bStarts) return 1
            return aTitle.localeCompare(bTitle)
          })

          return filtered.slice(0, 8).map((n) => ({
            id: n.id,
            title: n.title || 'Untitled',
            icon: n.icon ?? null
          }))
        },
        render: () => {
          let component: ReactRenderer<PageMentionHandle, PageMentionProps> | null = null
          let unmount: (() => void) | null = null

          return {
            onStart: (props: SuggestionProps<PageSuggestion>) => {
              component = new ReactRenderer(PageMentionMenu, {
                props: {
                  items: props.items,
                  command: (item: PageSuggestion) => props.command(item)
                } satisfies PageMentionProps,
                editor: props.editor
              })
              if (component.element) {
                component.element.style.zIndex = '99999'
              }
              unmount = props.mount(component.element as HTMLElement)
            },
            onUpdate: (props: SuggestionProps<PageSuggestion>) => {
              component?.updateProps({
                items: props.items,
                command: (item: PageSuggestion) => props.command(item)
              })
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                unmount?.()
                return true
              }
              return component?.ref?.onKeyDown(props) ?? false
            },
            onExit: () => {
              unmount?.()
              unmount = null
              component?.destroy()
              component = null
            }
          }
        }
      })
    ]
  }
})
