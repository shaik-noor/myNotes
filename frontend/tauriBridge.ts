import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog'
import type {
  AppSettings,
  BacklinkItem,
  CloudSyncConfig,
  CloudSyncResult,
  Note,
  NoteAttachment,
  NoteImportResult,
  Result
} from './types/notes'

export interface StreamEvent {
  type: 'start' | 'chunk' | 'done' | 'error' | 'canceled'
  text?: string
  accumulated?: string
  error?: string
}

export const tauriApi = {
  storage: {
    load: async <T = unknown>(key: string): Promise<Result<T>> => {
      return invoke<Result<T>>('storage_load', { key })
    },
    save: async (key: string, data: unknown): Promise<Result> => {
      return invoke<Result>('storage_save', { key, data })
    },
    backup: async (): Promise<Result<string>> => {
      const dateStr = new Date().toISOString().split('T')[0]
      const defaultFilename = `myNotes-backup-${dateStr}.json`
      const targetPath = await saveDialog({
        title: 'Export Notes Backup',
        defaultPath: defaultFilename,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })
      if (!targetPath) {
        return { success: false, error: 'Canceled by user' }
      }
      return invoke<Result<string>>('backup_export', { targetPath })
    },
    restore: async (): Promise<Result<{ noteCount: number }>> => {
      const selected = await openDialog({
        title: 'Restore Notes Backup',
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })
      if (!selected) {
        return { success: false, error: 'Canceled by user' }
      }
      const sourcePath = typeof selected === 'string' ? selected : selected[0]
      return invoke<Result<{ noteCount: number }>>('backup_import', { sourcePath })
    }
  },

  notes: {
    load: async (): Promise<Result<Note[]>> => {
      return invoke<Result<Note[]>>('notes_load')
    },
    save: async (notesList: unknown[]): Promise<Result> => {
      return invoke<Result>('notes_save', { notesList })
    },
    importLocalFile: async (): Promise<NoteImportResult | null> => {
      const selected = await openDialog({
        title: 'Import Notes (OneNote, HTML, TXT, Markdown)',
        multiple: false,
        directory: false,
        filters: [
          {
            name: 'Note Files',
            extensions: ['one', 'onex', 'onepkg', 'txt', 'md', 'markdown', 'html', 'htm']
          },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (!selected) return null
      const filePath = typeof selected === 'string' ? selected : selected[0]
      const res = await invoke<Result<NoteImportResult>>('notes_import_local_file', { filePath })
      if (res && res.success && res.data) {
        return res.data
      }
      if (res && res.error) {
        return { error: res.error }
      }
      return null
    },
    move: async (
      id: string,
      newParentId: string | null,
      prevSiblingSortKey: string | null,
      nextSiblingSortKey: string | null
    ): Promise<Result<{ id: string; parentId: string | null; sortKey: string }>> => {
      return invoke<Result<{ id: string; parentId: string | null; sortKey: string }>>('notes_move', {
        id,
        newParentId,
        prevSiblingSortKey,
        nextSiblingSortKey
      })
    },
    getBacklinks: async (noteId: string): Promise<Result<BacklinkItem[]>> => {
      return invoke<Result<BacklinkItem[]>>('notes_get_backlinks', { noteId })
    },
    attachFiles: async (noteId: string): Promise<Result<NoteAttachment[]>> => {
      const selected = await openDialog({
        title: 'Attach files to note',
        multiple: true,
        directory: false
      })
      if (!selected || (Array.isArray(selected) && selected.length === 0)) {
        return { success: true, data: [] }
      }
      const paths = Array.isArray(selected) ? selected : [selected]
      return invoke<Result<NoteAttachment[]>>('attachment_attach_paths', { noteId, paths })
    },
    attachFromPaths: async (noteId: string, paths: string[]): Promise<Result<NoteAttachment[]>> => {
      return invoke<Result<NoteAttachment[]>>('attachment_attach_paths', { noteId, paths })
    },
    attachBytes: async (
      noteId: string,
      name: string,
      data: Uint8Array
    ): Promise<Result<NoteAttachment>> => {
      return invoke<Result<NoteAttachment>>('attachment_attach_bytes', {
        noteId,
        name,
        bytes: Array.from(data)
      })
    },
    listAttachments: async (noteId: string): Promise<Result<NoteAttachment[]>> => {
      return invoke<Result<NoteAttachment[]>>('attachment_list', { noteId })
    },
    getAttachmentDataUrl: async (
      id: string
    ): Promise<Result<{ mime: string; dataUrl: string }>> => {
      return invoke<Result<{ mime: string; dataUrl: string }>>('attachment_get_data_url', { id })
    },
    saveAttachmentAs: async (id: string): Promise<Result<string>> => {
      const targetPath = await saveDialog({
        title: 'Save attachment',
        defaultPath: 'attachment'
      })
      if (!targetPath) return { success: false, error: 'Canceled by user' }
      return invoke<Result<string>>('attachment_save_as', { id, targetPath })
    },
    openAttachment: async (id: string): Promise<Result> => {
      return invoke<Result>('attachment_open', { id })
    },
    revealAttachment: async (id: string): Promise<Result> => {
      return invoke<Result>('attachment_reveal', { id })
    },
    removeAttachment: async (id: string): Promise<Result> => {
      return invoke<Result>('attachment_remove', { id })
    }
  },

  app: {
    getSettings: async (): Promise<Result<AppSettings>> => {
      return invoke<Result<AppSettings>>('app_get_settings')
    },
    saveSettings: async (settings: unknown): Promise<Result<AppSettings>> => {
      return invoke<Result<AppSettings>>('app_save_settings', { settings })
    },
    exportBackup: async (): Promise<Result<string>> => {
      const dateStr = new Date().toISOString().split('T')[0]
      const defaultFilename = `myNotes-backup-${dateStr}.json`
      const targetPath = await saveDialog({
        title: 'Export Notes Backup',
        defaultPath: defaultFilename,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })
      if (!targetPath) {
        return { success: false, error: 'Canceled by user' }
      }
      return invoke<Result<string>>('backup_export', { targetPath })
    },
    importBackup: async (): Promise<Result<{ noteCount: number }>> => {
      const selected = await openDialog({
        title: 'Restore Notes Backup',
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })
      if (!selected) {
        return { success: false, error: 'Canceled by user' }
      }
      const sourcePath = typeof selected === 'string' ? selected : selected[0]
      return invoke<Result<{ noteCount: number }>>('backup_import', { sourcePath })
    }
  },

  window: {
    minimize: async (): Promise<void> => {
      return invoke('window_minimize')
    },
    maximize: async (): Promise<void> => {
      return invoke('window_maximize')
    },
    close: async (): Promise<void> => {
      return invoke('window_close')
    },
    isMaximized: async (): Promise<boolean> => {
      return invoke<boolean>('window_is_maximized')
    }
  },

  ai: {
    chatCompletionStream: async (
      streamId: string,
      systemPrompt: string,
      messages: { role: string; content: string }[]
    ): Promise<Result> => {
      return invoke<Result>('ai_chat_completion_stream', {
        streamId,
        systemPrompt,
        messages
      })
    },
    onStreamEvent: (streamId: string, callback: (event: StreamEvent) => void): (() => void) => {
      const channel = `ai:stream:${streamId}`
      let unlistenFn: (() => void) | null = null
      listen<StreamEvent>(channel, (event) => {
        callback(event.payload)
      }).then((unsub) => {
        unlistenFn = unsub
      })
      return () => {
        if (unlistenFn) unlistenFn()
      }
    },
    cancelStream: async (streamId: string): Promise<Result> => {
      return invoke<Result>('ai_cancel_stream', { streamId })
    }
  },

  cloud: {
    getConfig: async (): Promise<Result<CloudSyncConfig>> => {
      return invoke<Result<CloudSyncConfig>>('cloud_get_config')
    },
    saveCredentials: async (
      clientId?: string,
      clientSecret?: string,
      authServerUrl?: string
    ): Promise<Result> => {
      return invoke<Result>('cloud_save_credentials', { clientId, clientSecret, authServerUrl })
    },
    resetCredentials: async (): Promise<Result> => {
      return invoke<Result>('cloud_reset_credentials')
    },
    login: async (): Promise<Result<{ email: string; name: string }>> => {
      return invoke<Result<{ email: string; name: string }>>('cloud_login')
    },
    logout: async (): Promise<Result> => {
      return invoke<Result>('cloud_logout')
    },
    syncNow: async (): Promise<Result<CloudSyncResult>> => {
      return invoke<Result<CloudSyncResult>>('cloud_sync_now')
    },
    setAutoSync: async (enabled: boolean): Promise<Result> => {
      return invoke<Result>('cloud_set_auto_sync', { enabled })
    },
    onSyncStatusChange: (callback: (data: unknown) => void): (() => void) => {
      const unsubs: Array<() => void> = []
      listen('cloud:sync-started', (e) => callback(e.payload)).then((u) => unsubs.push(u))
      listen('cloud:sync-completed', (e) => callback(e.payload)).then((u) => unsubs.push(u))
      listen('cloud:sync-error', (e) => callback(e.payload)).then((u) => unsubs.push(u))
      return () => {
        for (const u of unsubs) u()
      }
    },
    onVaultUpdated: (callback: (data: unknown) => void): (() => void) => {
      let unlistenFn: (() => void) | null = null
      listen('cloud:vault-updated', (e) => callback(e.payload)).then((u) => {
        unlistenFn = u
      })
      return () => {
        if (unlistenFn) unlistenFn()
      }
    }
  }
}

// Auto-register window.api if in Tauri or browser environment
if (typeof window !== 'undefined') {
  ;(window as unknown as { api: typeof tauriApi }).api = tauriApi
}
