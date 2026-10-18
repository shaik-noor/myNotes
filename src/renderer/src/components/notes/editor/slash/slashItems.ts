import { toast } from '../../../ui/toast'
import type { Editor, Range } from '@tiptap/react'
import {
  CheckSquare,
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Paperclip,
  Quote,
  Table as TableIcon,
  Type
} from 'lucide-react'
import { NoteAttachmentsService } from '../../../../services/noteAttachments'
import { emitNoteAttachmentsChanged } from '../attachmentEvents'
import { insertAttachmentWithEditor } from '../attachmentInsert'

export interface SlashCommandItem {
  title: string
  description: string
  icon: LucideIcon
  keywords?: string[]
  group: 'Basic' | 'Lists' | 'Insert'
  command: (props: { editor: Editor; range: Range }) => void
}

export function buildSlashItems(noteId: string): SlashCommandItem[] {
  return [
    {
      title: 'Text',
      description: 'Plain paragraph',
      icon: Type,
      group: 'Basic',
      keywords: ['paragraph', 'body'],
      command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run()
    },
    {
      title: 'Heading 1',
      description: 'Large section title',
      icon: Heading1,
      group: 'Basic',
      keywords: ['h1', 'title'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    },
    {
      title: 'Heading 2',
      description: 'Medium section title',
      icon: Heading2,
      group: 'Basic',
      keywords: ['h2', 'subtitle'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    },
    {
      title: 'Heading 3',
      description: 'Small section title',
      icon: Heading3,
      group: 'Basic',
      keywords: ['h3'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    },
    {
      title: 'Bullet list',
      description: 'Unordered list',
      icon: List,
      group: 'Lists',
      keywords: ['ul', 'unordered', 'bullet'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
    {
      title: 'Numbered list',
      description: 'Ordered list',
      icon: ListOrdered,
      group: 'Lists',
      keywords: ['ol', 'ordered', 'number'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
    {
      title: 'To-do list',
      description: 'Checklist with checkboxes',
      icon: CheckSquare,
      group: 'Lists',
      keywords: ['task', 'checkbox', 'todo'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run()
    },
    {
      title: 'Quote',
      description: 'Blockquote callout',
      icon: Quote,
      group: 'Insert',
      keywords: ['blockquote', 'callout'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
    {
      title: 'Code block',
      description: 'Syntax-highlighted code',
      icon: Code2,
      group: 'Insert',
      keywords: ['pre', 'snippet'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
    {
      title: 'Divider',
      description: 'Horizontal rule',
      icon: Minus,
      group: 'Insert',
      keywords: ['hr', 'rule', 'separator'],
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
    {
      title: 'Table',
      description: 'Insert a 3×3 table',
      icon: TableIcon,
      group: 'Insert',
      keywords: ['grid'],
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
    },
    {
      title: 'Image',
      description: 'Attach an image',
      icon: ImageIcon,
      group: 'Insert',
      keywords: ['picture', 'photo', 'upload'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        void attachAndInsert(editor, noteId)
      }
    },
    {
      title: 'Attach file',
      description: 'Attach a file of any format',
      icon: Paperclip,
      group: 'Insert',
      keywords: ['attachment', 'upload', 'document', 'pdf', 'doc', 'file'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        void attachAndInsert(editor, noteId)
      }
    },
    {
      title: 'Link to page',
      description: 'Reference another note',
      icon: FileText,
      group: 'Insert',
      keywords: ['page', 'link', 'mention', 'reference'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent('@').run()
      }
    }
  ]
}

async function attachAndInsert(editor: Editor, noteId: string): Promise<void> {
  const attachments = await NoteAttachmentsService.attachFiles(noteId)
  if (attachments.length === 0) return
  let inserted = false
  for (const att of attachments) {
    if (att.error) {
      toast.error(`Could not attach ${att.name}`, { description: att.error })
      continue
    }
    insertAttachmentWithEditor(editor, att)
    inserted = true
  }
  if (inserted) emitNoteAttachmentsChanged(noteId)
}

export function filterSlashItems(items: SlashCommandItem[], query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.keywords ?? []).some((k) => k.toLowerCase().includes(q))
  )
}
