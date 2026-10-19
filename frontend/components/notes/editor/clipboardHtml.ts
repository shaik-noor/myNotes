import type { Slice } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

const BORDER = '1px solid #d0d7de'
const TABLE_STYLE = `border-collapse: collapse; border: ${BORDER}`
const CELL_STYLE = `border: ${BORDER}; padding: 6px 10px; vertical-align: top`
const HEADER_STYLE = `${CELL_STYLE}; background-color: #f3f4f6; font-weight: 600; text-align: left`

function addStyle(el: Element, style: string): void {
  const own = el.getAttribute('style')
  el.setAttribute('style', own ? `${style}; ${own}` : style)
}

export function inlineTableStyles(root: HTMLElement): void {
  for (const table of root.querySelectorAll('table')) {
    addStyle(table, TABLE_STYLE)
    table.setAttribute('cellspacing', '0')
  }
  for (const cell of root.querySelectorAll('td')) addStyle(cell, CELL_STYLE)
  for (const cell of root.querySelectorAll('th')) addStyle(cell, HEADER_STYLE)
  for (const p of root.querySelectorAll('td > p, th > p')) addStyle(p, 'margin: 0')
}

export function serializeTableClipboard(
  view: EditorView,
  slice: Slice
): { html: string; text: string } | null {
  const { dom, text } = view.serializeForClipboard(slice)
  if (!dom.querySelector('table')) return null
  inlineTableStyles(dom)
  return { html: dom.innerHTML, text }
}

export function handleTableCopy(view: EditorView, event: ClipboardEvent): boolean {
  const { selection } = view.state
  const data = event.clipboardData
  if (selection.empty || !data) return false

  const payload = serializeTableClipboard(view, selection.content())
  if (!payload) return false

  event.preventDefault()
  data.clearData()
  data.setData('text/html', payload.html)
  data.setData('text/plain', payload.text)
  if (event.type === 'cut') {
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta('uiEvent', 'cut'))
  }
  return true
}
