/**
 * Data structures and types for myNotes.
 */

export interface Note {
  id: string
  caseId?: string
  caseNumber?: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  icon?: string
  coverImage?: string
  pinned?: boolean
  tags?: string[]
  fullWidth?: boolean
  parentId?: string | null
  sortKey?: string | null
}

export type NoteAttachmentKind = 'image' | 'text' | 'binary'

export interface NoteAttachment {
  id?: string
  noteId?: string
  name: string
  size: number
  kind?: NoteAttachmentKind
  ext?: string
  mime?: string
  path?: string
  previewDataUrl?: string
  error?: string
  createdAt?: string
}

export interface NoteAttachmentRow {
  id: string
  noteId: string | null
  name: string | null
  kind: string | null
  ext: string | null
  mime: string | null
  size: number | null
  data: string | null
  createdAt: string | null
}

export interface NoteImportResult {
  type?: 'pages' | 'single'
  notebookTitle?: string
  pages?: { title: string; content: string }[]
  title?: string
  content?: string
  format?: 'html' | 'markdown'
  error?: string
}

export interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

export type ThemeMode = 'light' | 'dark' | 'system'
export type Palette = 'blue' | 'amber' | 'violet' | 'emerald' | 'rose'
export type EditorFont = 'font-sans-editor' | 'font-serif-editor' | 'font-mono-editor'

export interface AppSettings {
  theme: ThemeMode
  palette: Palette
  fontClass: EditorFont
  fullWidthDefault: boolean
  autoSaveDelay: number
}

export interface BackupManifest {
  version: number
  timestamp: string
  notes: Note[]
  noteAttachments: Record<string, NoteAttachmentRow[]>
  settings?: AppSettings
}
