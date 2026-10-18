import { Fragment, type Node as PMNode } from '@tiptap/pm/model'
import { type EditorState, TextSelection } from '@tiptap/pm/state'
import {
  CellSelection,
  deleteCellSelection,
  findTable,
  isInTable,
  moveTableColumn,
  moveTableRow,
  selectedRect,
  selectionCell,
  TableMap
} from '@tiptap/pm/tables'
import type { Editor } from '@tiptap/react'
import { serializeTableClipboard } from './clipboardHtml'

export type ColumnAlign = 'left' | 'center' | 'right'

interface TableAt {
  node: PMNode
  pos: number
  start: number
  map: TableMap
}

function tableAt(doc: PMNode, pos: number): TableAt | null {
  const node = doc.nodeAt(pos)
  if (node?.type.spec.tableRole !== 'table') return null
  return { node, pos, start: pos + 1, map: TableMap.get(node) }
}

function headerRowCount(table: PMNode): number {
  const first = table.firstChild
  if (!first || first.childCount === 0) return 0
  let allHeader = true
  first.forEach((cell) => {
    if (cell.type.spec.tableRole !== 'header_cell') allHeader = false
  })
  return allHeader ? 1 : 0
}

function hasSpans(table: PMNode, attr: 'colspan' | 'rowspan' | 'any'): boolean {
  let found = false
  table.descendants((node) => {
    if (found) return false
    const role = node.type.spec.tableRole
    if (role === 'cell' || role === 'header_cell') {
      const col = (node.attrs.colspan as number) > 1
      const row = (node.attrs.rowspan as number) > 1
      if (attr === 'colspan' ? col : attr === 'rowspan' ? row : col || row) found = true
      return false
    }
    return true
  })
  return found
}

export function tablePosFromDom(editor: Editor, wrapper: HTMLElement): number | null {
  const cell = wrapper.querySelector('td, th')
  if (!cell) return null
  try {
    return findTable(editor.state.doc.resolve(editor.view.posAtDOM(cell, 0)))?.pos ?? null
  } catch {
    return null
  }
}

export function selectionTablePos(state: EditorState): number | null {
  return findTable(state.selection.$from)?.pos ?? null
}

export function selectTable(editor: Editor, tablePos: number): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      const t = tableAt(tr.doc, tablePos)
      if (!t) return false
      const cells = t.map.map
      tr.setSelection(
        CellSelection.create(tr.doc, t.start + cells[0], t.start + cells[cells.length - 1])
      )
      return true
    })
    .run()
}

export async function copyTable(editor: Editor, tablePos: number): Promise<boolean> {
  const node = editor.state.doc.nodeAt(tablePos)
  if (node?.type.spec.tableRole !== 'table') return false
  const payload = serializeTableClipboard(
    editor.view,
    editor.state.doc.slice(tablePos, tablePos + node.nodeSize)
  )
  if (!payload) return false
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([payload.html], { type: 'text/html' }),
      'text/plain': new Blob([payload.text], { type: 'text/plain' })
    })
  ])
  return true
}

export function addRowAtEnd(editor: Editor, tablePos: number): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      const t = tableAt(tr.doc, tablePos)
      if (!t) return false
      const lastCell = t.start + t.map.map[t.map.map.length - 1]
      tr.setSelection(TextSelection.near(tr.doc.resolve(lastCell + 1)))
      return true
    })
    .addRowAfter()
    .command(({ tr }) => {
      const t = tableAt(tr.doc, tablePos)
      if (!t) return false
      const cell = t.start + t.map.map[(t.map.height - 1) * t.map.width]
      tr.setSelection(TextSelection.near(tr.doc.resolve(cell + 1)))
      return true
    })
    .run()
}

export function addColumnAtEnd(editor: Editor, tablePos: number): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr }) => {
      const t = tableAt(tr.doc, tablePos)
      if (!t) return false
      const topRight = t.start + t.map.map[t.map.width - 1]
      tr.setSelection(TextSelection.near(tr.doc.resolve(topRight + 1)))
      return true
    })
    .addColumnAfter()
    .command(({ tr }) => {
      const t = tableAt(tr.doc, tablePos)
      if (!t) return false
      tr.setSelection(TextSelection.near(tr.doc.resolve(t.start + t.map.map[t.map.width - 1] + 1)))
      return true
    })
    .run()
}

export function setColumnAlign(editor: Editor, align: ColumnAlign): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, tr, dispatch }) => {
      if (!isInTable(state)) return false
      if (!dispatch) return true
      const { map, table, tableStart, left, right } = selectedRect(state)
      const value = align === 'left' ? null : align
      const seen = new Set<number>()
      for (let row = 0; row < map.height; row++) {
        for (let col = left; col < right; col++) {
          const offset = map.map[row * map.width + col]
          if (seen.has(offset)) continue
          seen.add(offset)
          const cell = table.nodeAt(offset)
          if (cell) tr.setNodeMarkup(tableStart + offset, null, { ...cell.attrs, align: value })
        }
      }
      return true
    })
    .run()
}

export function currentColumnAlign(state: EditorState): ColumnAlign {
  if (!isInTable(state)) return 'left'
  const { map, table, left } = selectedRect(state)
  const align = table.nodeAt(map.map[left])?.attrs.align
  return align === 'center' || align === 'right' ? align : 'left'
}

export function sortByColumn(editor: Editor, direction: 1 | -1): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, tr, dispatch }) => {
      if (!canSortTable(state)) return false
      if (!dispatch) return true
      const { table, tableStart, left: col } = selectedRect(state)
      const head = headerRowCount(table)
      const rows: PMNode[] = []
      table.forEach((row) => {
        rows.push(row)
      })
      const key = (row: PMNode): string => row.maybeChild(col)?.textContent.trim() ?? ''
      const body = rows.slice(head).sort((a, b) => {
        const ka = key(a)
        const kb = key(b)
        if (!ka || !kb) return ka ? -1 : kb ? 1 : 0
        return direction * ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' })
      })
      const tablePos = tableStart - 1
      tr.replaceWith(
        tablePos,
        tablePos + table.nodeSize,
        table.copy(Fragment.from([...rows.slice(0, head), ...body]))
      )
      const t = tableAt(tr.doc, tablePos)
      if (t) {
        const cell = t.start + t.map.map[Math.min(head, t.map.height - 1) * t.map.width + col]
        tr.setSelection(TextSelection.near(tr.doc.resolve(cell + 1)))
      }
      return true
    })
    .run()
}

function canSortTable(state: EditorState): boolean {
  if (!isInTable(state)) return false
  const { table, map } = selectedRect(state)
  return !hasSpans(table, 'any') && map.height - headerRowCount(table) > 1
}

export function duplicateRows(editor: Editor): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, tr, dispatch }) => {
      if (!isInTable(state)) return false
      const { table, tableStart, top, bottom } = selectedRect(state)
      if (hasSpans(table, 'rowspan')) return false
      if (!dispatch) return true
      const head = headerRowCount(table)
      const cellType = state.schema.nodes.tableCell
      const copies: PMNode[] = []
      let insertAt = tableStart
      table.forEach((row, offset, index) => {
        if (index < top || index >= bottom) return
        if (index < head) {
          const cells: PMNode[] = []
          row.forEach((cell) => {
            cells.push(cellType.create(cell.attrs, cell.content, cell.marks))
          })
          copies.push(row.type.create(row.attrs, cells))
        } else {
          copies.push(row)
        }
        insertAt = tableStart + offset + row.nodeSize
      })
      tr.insert(insertAt, copies)
      return true
    })
    .run()
}

function rowMove(state: EditorState, dir: 1 | -1): { from: number; to: number } | null {
  if (!isInTable(state)) return null
  const { table, map, top, bottom } = selectedRect(state)
  if (bottom - top !== 1) return null
  const head = headerRowCount(table)
  const to = top + dir
  if (top < head || to < head || to >= map.height) return null
  return moveTableRow({ from: top, to, select: false })(state) ? { from: top, to } : null
}

function columnMove(state: EditorState, dir: 1 | -1): { from: number; to: number } | null {
  if (!isInTable(state)) return null
  const { map, left, right } = selectedRect(state)
  if (right - left !== 1) return null
  const to = left + dir
  if (to < 0 || to >= map.width) return null
  return moveTableColumn({ from: left, to, select: false })(state) ? { from: left, to } : null
}

export function moveRow(editor: Editor, dir: 1 | -1): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, dispatch }) => {
      const move = rowMove(state, dir)
      return !!move && moveTableRow({ ...move, select: true })(state, dispatch)
    })
    .run()
}

export function moveColumn(editor: Editor, dir: 1 | -1): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, dispatch }) => {
      const move = columnMove(state, dir)
      return !!move && moveTableColumn({ ...move, select: true })(state, dispatch)
    })
    .run()
}

export function clearCells(editor: Editor): boolean {
  return editor
    .chain()
    .focus()
    .command(({ state, tr, dispatch }) => {
      if (!isInTable(state)) return false
      if (!dispatch) return true
      if (!(state.selection instanceof CellSelection)) {
        tr.setSelection(new CellSelection(selectionCell(state)))
      }
      return deleteCellSelection(state, dispatch)
    })
    .run()
}

export interface TableMenuState {
  canMerge: boolean
  canSplit: boolean
  canMoveRowUp: boolean
  canMoveRowDown: boolean
  canMoveColumnLeft: boolean
  canMoveColumnRight: boolean
  canSort: boolean
  canDuplicateRow: boolean
  align: ColumnAlign
}

export function getTableMenuState(editor: Editor): TableMenuState {
  const { state } = editor
  const inTable = isInTable(state)
  return {
    canMerge: editor.can().mergeCells(),
    canSplit: editor.can().splitCell(),
    canMoveRowUp: !!rowMove(state, -1),
    canMoveRowDown: !!rowMove(state, 1),
    canMoveColumnLeft: !!columnMove(state, -1),
    canMoveColumnRight: !!columnMove(state, 1),
    canSort: canSortTable(state),
    canDuplicateRow: inTable && !hasSpans(selectedRect(state).table, 'rowspan'),
    align: currentColumnAlign(state)
  }
}

