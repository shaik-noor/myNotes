import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { SlashMenu, type SlashMenuHandle, type SlashMenuProps } from './SlashMenu'
import { buildSlashItems, filterSlashItems, type SlashCommandItem } from './slashItems'

export interface SlashCommandOptions {
  /** The open note's id — the target for `/image` + `/file` attachments. */
  noteId: string
}

/**
 * Slash `/` command menu. Built on the `@tiptap/suggestion` utility.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      noteId: ''
    }
  },

  addProseMirrorPlugins() {
    const items = buildSlashItems(this.options.noteId)

    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: '/',
        startOfLine: true,
        allowSpaces: false,
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        items: ({ query }) => filterSlashItems(items, query),
        render: () => {
          let component: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null
          let unmount: (() => void) | null = null

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(SlashMenu, {
                props: {
                  items: props.items,
                  command: (item: SlashCommandItem) => props.command(item)
                } satisfies SlashMenuProps,
                editor: props.editor
              })
              if (component.element) {
                component.element.style.zIndex = '99999'
              }
              unmount = props.mount(component.element as HTMLElement)
            },
            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              component?.updateProps({
                items: props.items,
                command: (item: SlashCommandItem) => props.command(item)
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

