import { Table } from '@tiptap/extension-table'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export function serializeTableToMarkdown(state: any, node: ProseMirrorNode): void {
  state.inTable = true
  const rows: ProseMirrorNode[] = []
  node.forEach((row: ProseMirrorNode) => {
    rows.push(row)
  })

  if (rows.length === 0) {
    state.inTable = false
    return
  }

  const firstRow = rows[0]
  let hasHeader = false
  firstRow.forEach((cell: ProseMirrorNode) => {
    if (cell.type.name === 'tableHeader') hasHeader = true
  })

  const renderCell = (cell: ProseMirrorNode): string => {
    const prevOut = state.out
    state.out = ''
    let first = true
    cell.forEach((child: ProseMirrorNode) => {
      if (!first) {
        state.write('<br>')
      }
      first = false
      if (child.isInline) {
        state.render(child, cell)
      } else {
        state.renderInline(child)
      }
    })
    let cellStr = state.out
    state.out = prevOut
    cellStr = cellStr.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|')
    return cellStr.trim()
  }

  let maxCols = 0
  rows.forEach((row: ProseMirrorNode) => {
    let rowCols = 0
    row.forEach((cell: ProseMirrorNode) => {
      rowCols += cell.attrs?.colspan ? cell.attrs.colspan : 1
    })
    maxCols = Math.max(maxCols, rowCols)
  })

  if (maxCols === 0) {
    state.inTable = false
    return
  }

  const aligns: (string | null)[] = []
  firstRow.forEach((cell: ProseMirrorNode) => {
    const span = cell.attrs?.colspan ? cell.attrs.colspan : 1
    for (let s = 0; s < span; s++) aligns.push((cell.attrs?.align as string | null) ?? null)
  })
  const delimiter = (c: number): string =>
    aligns[c] === 'center' ? ':---:' : aligns[c] === 'right' ? '---:' : '---'
  const delimiterRow = `| ${Array.from({ length: maxCols }, (_, c) => delimiter(c)).join(' | ')} |`

  if (!hasHeader) {
    state.write(
      '| ' +
        Array.from({ length: maxCols })
          .map(() => ' ')
          .join(' | ') +
        ' |'
    )
    state.ensureNewLine()
    state.write(delimiterRow)
    state.ensureNewLine()
  }

  let isFirst = true
  rows.forEach((row: ProseMirrorNode) => {
    const cells: string[] = []
    row.forEach((cell: ProseMirrorNode) => {
      const rendered = renderCell(cell)
      cells.push(rendered)
      const span = cell.attrs?.colspan ? cell.attrs.colspan : 1
      for (let i = 1; i < span; i++) {
        cells.push(' ')
      }
    })

    while (cells.length < maxCols) {
      cells.push(' ')
    }

    state.write('| ' + cells.join(' | ') + ' |')
    state.ensureNewLine()

    if (isFirst && hasHeader) {
      state.write(delimiterRow)
      state.ensureNewLine()
    }
    isFirst = false
  })

  state.ensureNewLine()
  state.inTable = false
}

export const CustomTable = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize: serializeTableToMarkdown,
        parse: {}
      }
    }
  }
})

