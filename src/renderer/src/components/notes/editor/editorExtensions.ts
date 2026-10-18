import { Extension } from '@tiptap/core'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import ImageExtension from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { CharacterCount, Focus } from '@tiptap/extensions'
import type { AnyExtension } from '@tiptap/react'
import { ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import { AiGhost } from './aiGhost'
import { CodeBlockView } from './CodeBlockView'
import { CustomTable } from './customTable'
import { PageMention } from './mention/pageMention'
import { NoteImageView } from './NoteImageView'
import { SearchHighlight } from './searchHighlight'
import { SlashCommand } from './slash/slashCommand'

const lowlight = createLowlight(common)

export const OPEN_LINK_POPOVER_EVENT = 'notes:open-link-popover'

const LinkShortcut = Extension.create({
  name: 'linkShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        window.dispatchEvent(new CustomEvent(OPEN_LINK_POPOVER_EVENT))
        return true
      }
    }
  }
})

export function buildEditorExtensions(noteId: string): AnyExtension[] {
  return [
    StarterKit.configure({ codeBlock: false }),
    CodeBlockLowlight.configure({ lowlight }).extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockView)
      }
    }),
    Underline,
    ImageExtension.extend({
      addNodeView() {
        return ReactNodeViewRenderer(NoteImageView)
      }
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return 'Heading'
        return "Write, or press '/' for commands…"
      }
    }),
    TextStyle,
    FontFamily,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({
      openOnClick: false,
      defaultProtocol: 'https',
      protocols: ['mynotes', 'mydesk-note', 'mydesk-attachment'],
      HTMLAttributes: {
        class: 'text-primary underline cursor-pointer hover:text-primary/80 transition-colors',
        rel: 'noopener noreferrer'
      }
    }),
    TaskList,
    TaskItem.configure({ nested: true, HTMLAttributes: { class: 'flex items-start gap-2 my-1' } }),
    CustomTable.configure({ resizable: true, cellMinWidth: 80 }),
    TableRow,
    TableCell,
    TableHeader,
    Focus.configure({ className: 'has-focus', mode: 'shallowest' }),
    CharacterCount,
    Markdown.configure({
      html: true,
      tightLists: true,
      linkify: true,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: false
    }),
    AiGhost,
    SearchHighlight,
    LinkShortcut,
    SlashCommand.configure({ noteId }),
    PageMention
  ]
}

