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

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[]
  depth: number
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

export interface BacklinkItem {
  id: string
  title: string
  icon: string | null
  parentId: string | null
}

export interface CloudSyncConfig {
  userEmail?: string | null
  userName?: string | null
  userPicture?: string | null
  autoSync: boolean
  lastSyncTime?: string | null
  isConnected: boolean
  isSyncing: boolean
  lastError?: string | null
  fileId?: string | null
  isReady?: boolean
}

export interface CloudSyncResult {
  notesCount: number
  uploaded: boolean
  downloaded: boolean
  timestamp: string
}
