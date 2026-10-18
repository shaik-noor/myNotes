import type { Fragment, Node as PMNode, Slice } from '@tiptap/pm/model'

export function sliceToPlainText(slice: Slice): string {
  return fragmentToPlainText(slice.content)
}

function fragmentToPlainText(fragment: Fragment): string {
  if (fragment.firstChild?.isInline) return inlineText(fragment)
  const blocks: string[] = []
  fragment.forEach((node) => {
    const lines = blockLines(node)
    if (lines.length > 0) blocks.push(lines.join('\n'))
  })
  return blocks.join('\n\n')
}

function inlineText(content: Fragment): string {
  let out = ''
  content.forEach((child) => {
    if (child.isText) out += child.text ?? ''
    else if (child.type.name === 'hardBreak') out += '\n'
    else if (child.type.name === 'image') out += (child.attrs.alt as string | null) ?? ''
    else out += child.textContent
  })
  return out
}

function cellText(cell: PMNode): string {
  return inlineText(cell.content)
    .replace(/\r?\n+/g, ' ')
    .trim()
}

function blockLines(node: PMNode): string[] {
  const name = node.type.name
  if (name === 'codeBlock') return node.textContent.split('\n')
  if (node.isTextblock) {
    const text = inlineText(node.content)
    return text ? text.split('\n') : []
  }
  if (name === 'bulletList' || name === 'orderedList' || name === 'taskList') {
    return listLines(node)
  }
  if (name === 'table') {
    const rows: string[] = []
    node.forEach((row) => {
      const cells: string[] = []
      row.forEach((cell) => {
        cells.push(cellText(cell))
      })
      rows.push(cells.join('\t'))
    })
    return rows
  }
  if (name === 'tableRow') {
    const cells: string[] = []
    node.forEach((cell) => {
      cells.push(cellText(cell))
    })
    return [cells.join('\t')]
  }
  if (name === 'tableCell' || name === 'tableHeader') return [cellText(node)]
  if (name === 'horizontalRule') return []
  if (name === 'image') {
    const alt = (node.attrs.alt as string | null) ?? ''
    return alt ? [alt] : []
  }
  if (node.isLeaf) return node.textContent ? [node.textContent] : []

  const out: string[] = []
  node.forEach((child) => {
    const lines = blockLines(child)
    if (lines.length === 0) return
    if (out.length > 0) out.push('')
    out.push(...lines)
  })
  return out
}

function listLines(list: PMNode): string[] {
  const name = list.type.name
  const out: string[] = []
  let n = name === 'orderedList' ? Number(list.attrs.start ?? 1) || 1 : 1
  list.forEach((item) => {
    const marker =
      name === 'orderedList'
        ? `${n++}. `
        : name === 'taskList'
          ? item.attrs.checked
            ? '[x] '
            : '[ ] '
          : '- '
    const lines: string[] = []
    item.forEach((child) => {
      lines.push(...blockLines(child))
    })
    if (lines.length === 0) {
      out.push(marker.trimEnd())
      return
    }
    out.push(marker + lines[0])
    for (let i = 1; i < lines.length; i++) {
      out.push(`  ${lines[i]}`)
    }
  })
  return out
}
