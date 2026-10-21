import { Schema } from '@tiptap/pm/model'
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  MarkdownSerializer
} from 'prosemirror-markdown'
import { describe, expect, it } from 'vitest'
import { serializeTableToMarkdown } from '../components/notes/editor/customTable'

const schema = new Schema({
  nodes: defaultMarkdownParser.schema.spec.nodes.append({
    table: { group: 'block', content: 'tableRow+' },
    tableRow: { content: '(tableHeader | tableCell)+' },
    tableHeader: { content: 'paragraph+' },
    tableCell: { content: 'paragraph+' }
  }),
  marks: defaultMarkdownParser.schema.spec.marks
})
const paragraph = (text: string) => schema.nodes.paragraph.create(null, schema.text(text))
const table = schema.nodes.table.create(null, [
  schema.nodes.tableRow.create(null, [schema.nodes.tableHeader.create(null, paragraph('Task'))]),
  schema.nodes.tableRow.create(null, [
    schema.nodes.tableCell.create(null, paragraph('Review | share'))
  ])
])
const serializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    table: (state, node) =>
      serializeTableToMarkdown(state as typeof state & { out: string; inTable: boolean }, node)
  },
  defaultMarkdownSerializer.marks
)

describe('editor table markdown', () => {
  it('keeps a table separate from the preceding numbered list after saving', () => {
    const list = schema.nodes.ordered_list.create(null, [
      schema.nodes.list_item.create(null, paragraph('Share the update'))
    ])
    const markdown = serializer.serialize(
      schema.nodes.doc.create(null, [list, table, paragraph('Next steps')])
    )
    expect(markdown).toBe(
      '1. Share the update\n\n| Task |\n| --- |\n| Review \\| share |\n\nNext steps'
    )
  })

  it('keeps a table separate from an adjacent paragraph', () => {
    const markdown = serializer.serialize(
      schema.nodes.doc.create(null, [paragraph('Before'), table, paragraph('After')])
    )
    expect(markdown).toContain('Before\n\n| Task |')
    expect(markdown).toContain('| Review \\| share |\n\nAfter')
  })
})
