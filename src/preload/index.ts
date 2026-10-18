import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

export interface StreamEvent {
  type: 'start' | 'chunk' | 'done' | 'error' | 'canceled'
  text?: string
  accumulated?: string
  error?: string
}

const api = {
  storage: {
    load: (key: string) => ipcRenderer.invoke('storage:load', key),
    save: (key: string, data: unknown) => ipcRenderer.invoke('storage:save', key, data),
    backup: () => ipcRenderer.invoke('backup:export'),
    restore: () => ipcRenderer.invoke('backup:import')
  },

  notes: {
    load: () => ipcRenderer.invoke('notes:load'),
    save: (notesList: unknown[]) => ipcRenderer.invoke('notes:save', notesList),
    importLocalFile: () => ipcRenderer.invoke('notes:importLocalFile'),
    move: (
      id: string,
      newParentId: string | null,
      prevSiblingSortKey: string | null,
      nextSiblingSortKey: string | null
    ) => ipcRenderer.invoke('notes:move', id, newParentId, prevSiblingSortKey, nextSiblingSortKey),
    getBacklinks: (noteId: string) => ipcRenderer.invoke('notes:getBacklinks', noteId),
    attachFiles: (noteId: string) => ipcRenderer.invoke('notes:attachFiles', noteId),
    attachFromPaths: (noteId: string, paths: string[]) =>
      ipcRenderer.invoke('notes:attachFromPaths', noteId, paths),
    attachBytes: (noteId: string, name: string, data: Uint8Array) =>
      ipcRenderer.invoke('notes:attachBytes', noteId, name, data),
    listAttachments: (noteId: string) => ipcRenderer.invoke('notes:listAttachments', noteId),
    getAttachmentDataUrl: (id: string) => ipcRenderer.invoke('notes:getAttachmentDataUrl', id),
    saveAttachmentAs: (id: string) => ipcRenderer.invoke('notes:saveAttachmentAs', id),
    openAttachment: (id: string) => ipcRenderer.invoke('notes:openAttachment', id),
    revealAttachment: (id: string) => ipcRenderer.invoke('notes:revealAttachment', id),
    removeAttachment: (id: string) => ipcRenderer.invoke('notes:removeAttachment', id)
  },

  app: {
    getSettings: () => ipcRenderer.invoke('app:getSettings'),
    saveSettings: (settings: unknown) => ipcRenderer.invoke('app:saveSettings', settings),
    exportBackup: () => ipcRenderer.invoke('backup:export'),
    importBackup: () => ipcRenderer.invoke('backup:import')
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  ai: {
    chatCompletionStream: (
      streamId: string,
      systemPrompt: string,
      messages: { role: string; content: string }[]
    ) => ipcRenderer.invoke('ai:chatCompletionStream', streamId, systemPrompt, messages),
    onStreamEvent: (streamId: string, callback: (event: StreamEvent) => void) => {
      const channel = `ai:stream:${streamId}`
      const listener = (_: IpcRendererEvent, event: StreamEvent) => callback(event)
      ipcRenderer.on(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    cancelStream: (streamId: string) => ipcRenderer.invoke('ai:cancelStream', streamId)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
