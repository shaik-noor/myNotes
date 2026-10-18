import { generateJSON } from '@tiptap/core'
import { Editor } from '@tiptap/react'
import { buildEditorExtensions } from './editorExtensions'
import { decodeHtmlEntities, looksLikeLegacyHtml } from './legacyHtmlDetect'

export { decodeHtmlEntities, looksLikeLegacyHtml }

let cachedExtensions: ReturnType<typeof buildEditorExtensions> | null = null
function getExtensions(): ReturnType<typeof buildEditorExtensions> {
  if (!cachedExtensions) cachedExtensions = buildEditorExtensions('')
  return cachedExtensions
}

let converter: Editor | null = null
function getConverter(): Editor {
  if (converter && !converter.isDestroyed) return converter
  converter = new Editor({ extensions: getExtensions(), content: '' })
  return converter
}

/**
 * Convert a legacy HTML note body to markdown.
 */
export function htmlNoteToMarkdown(content: string): string {
  const html = decodeHtmlEntities(content)
  try {
    const json = generateJSON(html, getExtensions())
    const editor = getConverter()
    editor.commands.setContent(json, { emitUpdate: false })
    const storage = (editor.storage as unknown as Record<string, unknown>).markdown as
      | { getMarkdown: () => string }
      | undefined
    const md = storage?.getMarkdown() ?? ''
    return md.trim() ? md : content
  } catch {
    return content
  }
}

/** Free the shared converter editor (call after a bulk normalize pass). */
export function disposeHtmlConverter(): void {
  if (converter && !converter.isDestroyed) converter.destroy()
  converter = null
  cachedExtensions = null
}

/**
 * One-time migration pass over a notes collection.
 */
export function normalizeLegacyNotes<T extends { content: string }>(
  notes: T[]
): { notes: T[]; changed: boolean } {
  let changed = false
  const out = notes.map((note) => {
    if (!note.content || !looksLikeLegacyHtml(note.content)) return note
    const md = htmlNoteToMarkdown(note.content)
    if (md === note.content) return note
    changed = true
    return { ...note, content: md }
  })
  if (changed) disposeHtmlConverter()
  return { notes: out, changed }
}

