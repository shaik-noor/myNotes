import type {
  AppSettings,
  CloudSyncConfig,
  CloudSyncResult,
  Note,
  NoteAttachment,
  NoteImportResult,
  Result
} from '../main/types'
import type { StreamEvent } from './index'

declare global {
  interface Window {
    api: {
      storage: {
        load: (key: string) => Promise<Result<unknown>>
        save: (key: string, data: unknown) => Promise<Result<void>>
        backup: () => Promise<Result<string>>
        restore: () => Promise<Result<{ noteCount: number }>>
      }
      notes: {
        load: () => Promise<Result<Note[]>>
        save: (notesList: Note[]) => Promise<Result<void>>
        importLocalFile: () => Promise<NoteImportResult | null>
        move: (
          id: string,
          newParentId: string | null,
          prevSiblingSortKey: string | null,
          nextSiblingSortKey: string | null
        ) => Promise<Result<{ id: string; parentId: string | null; sortKey: string }>>
        getBacklinks: (
          noteId: string
        ) => Promise<
          Result<Array<{ id: string; title: string; icon: string | null; parentId: string | null }>>
        >
        attachFiles: (noteId: string) => Promise<Result<NoteAttachment[]>>
        attachFromPaths: (noteId: string, paths: string[]) => Promise<Result<NoteAttachment[]>>
        attachBytes: (
          noteId: string,
          name: string,
          data: Uint8Array
        ) => Promise<Result<NoteAttachment>>
        listAttachments: (noteId: string) => Promise<Result<NoteAttachment[]>>
        getAttachmentDataUrl: (
          id: string
        ) => Promise<Result<{ mime: string; dataUrl: string } | null>>
        saveAttachmentAs: (id: string) => Promise<Result<string | null>>
        openAttachment: (id: string) => Promise<Result<void>>
        revealAttachment: (id: string) => Promise<Result<void>>
        removeAttachment: (id: string) => Promise<Result<void>>
      }
      app: {
        getSettings: () => Promise<Result<AppSettings>>
        saveSettings: (settings: Partial<AppSettings>) => Promise<Result<AppSettings>>
        exportBackup: () => Promise<Result<string>>
        importBackup: () => Promise<Result<{ noteCount: number }>>
      }
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
        isMaximized: () => Promise<boolean>
      }
      ai: {
        chatCompletionStream: (
          streamId: string,
          systemPrompt: string,
          messages: { role: string; content: string }[]
        ) => Promise<Result<void>>
        onStreamEvent: (streamId: string, callback: (event: StreamEvent) => void) => () => void
        cancelStream: (streamId: string) => Promise<Result<void>>
      }
      cloud: {
        getConfig: () => Promise<Result<CloudSyncConfig>>
        saveCredentials: (clientId: string, clientSecret?: string) => Promise<Result<void>>
        login: () => Promise<Result<{ email: string; name: string }>>
        logout: () => Promise<Result<void>>
        syncNow: () => Promise<Result<CloudSyncResult>>
        setAutoSync: (enabled: boolean) => Promise<Result<void>>
        onSyncStatusChange: (callback: (data: unknown) => void) => () => void
        onVaultUpdated: (callback: (data: { notes: Note[] }) => void) => () => void
      }
    }
  }
}
