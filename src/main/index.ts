import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import type { AppSettings, Note, Result } from './types'
import { BackupService } from './services/backupService'
import { DatabaseService } from './services/databaseService'
import { ImportService } from './services/importService'
import { NoteAttachmentService } from './services/noteAttachmentService'

let mainWindow: BrowserWindow | null = null

function wrapData<T>(fn: () => T | Promise<T>): Promise<Result<T>> {
  return Promise.resolve()
    .then(() => fn())
    .then((data) => ({ success: true, data }))
    .catch((err: unknown) => ({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }))
}

function wrapVoid(fn: () => unknown): Promise<Result> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => ({ success: true }))
    .catch((err: unknown) => ({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 840,
    minHeight: 560,
    show: false,
    title: 'myNotes',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 14 },
    autoHideMenuBar: true,
    backgroundColor: '#191b1d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In dev mode, log renderer console messages and errors to terminal
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer load failed] ${errorCode}: ${errorDescription} (${validatedURL})`)
  })

  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register IPC handlers
function registerIpcHandlers(): void {
  // Storage & Notes
  ipcMain.handle('storage:load', (_, key: string) =>
    wrapData(async () => {
      if (key === 'notes') return DatabaseService.loadNotes()
      if (key === 'settings') return DatabaseService.getSettings()
      return null
    })
  )

  ipcMain.handle('storage:save', (_, key: string, data: unknown) =>
    wrapVoid(async () => {
      if (key === 'notes') {
        DatabaseService.saveNotes(data as Note[])
      } else if (key === 'settings') {
        DatabaseService.saveSettings(data as Partial<AppSettings>)
      }
    })
  )

  ipcMain.handle('notes:load', () => wrapData(() => DatabaseService.loadNotes()))

  ipcMain.handle('notes:save', (_, notesList: Note[]) =>
    wrapVoid(() => DatabaseService.saveNotes(notesList))
  )

  ipcMain.handle(
    'notes:move',
    (
      _,
      id: string,
      newParentId: string | null,
      prevSiblingSortKey: string | null,
      nextSiblingSortKey: string | null
    ) =>
      wrapData(() =>
        DatabaseService.moveNote(id, newParentId, prevSiblingSortKey, nextSiblingSortKey)
      )
  )

  ipcMain.handle('notes:getBacklinks', (_, noteId: string) =>
    wrapData(() => DatabaseService.getBacklinks(noteId))
  )

  ipcMain.handle('notes:importLocalFile', () => ImportService.importLocalFile())

  // Note Attachments
  ipcMain.handle('notes:attachFiles', (_, noteId: string) =>
    wrapData(() => NoteAttachmentService.pickAndStage(noteId))
  )

  ipcMain.handle('notes:attachFromPaths', (_, noteId: string, paths: string[]) =>
    wrapData(() => NoteAttachmentService.stageFromPaths(noteId, paths))
  )

  ipcMain.handle('notes:attachBytes', (_, noteId: string, name: string, data: Uint8Array) =>
    wrapData(() => NoteAttachmentService.stageFromBytes(noteId, name, Buffer.from(data)))
  )

  ipcMain.handle('notes:listAttachments', (_, noteId: string) =>
    wrapData(() => NoteAttachmentService.list(noteId))
  )

  ipcMain.handle('notes:getAttachmentDataUrl', (_, id: string) =>
    wrapData(() => NoteAttachmentService.getDataUrl(id))
  )

  ipcMain.handle('notes:saveAttachmentAs', (_, id: string) =>
    wrapData(() => NoteAttachmentService.saveAs(id))
  )

  ipcMain.handle('notes:openAttachment', (_, id: string) =>
    wrapVoid(() => NoteAttachmentService.open(id))
  )

  ipcMain.handle('notes:revealAttachment', (_, id: string) =>
    wrapVoid(() => NoteAttachmentService.reveal(id))
  )

  ipcMain.handle('notes:removeAttachment', (_, id: string) =>
    wrapVoid(() => NoteAttachmentService.remove(id))
  )

  // App Settings
  ipcMain.handle('app:getSettings', () => wrapData(() => DatabaseService.getSettings()))

  ipcMain.handle('app:saveSettings', (_, settings: Partial<AppSettings>) =>
    wrapData(() => DatabaseService.saveSettings(settings))
  )

  // Backup & Restore
  ipcMain.handle('backup:export', () => BackupService.exportBackup())

  ipcMain.handle('backup:import', () => BackupService.importBackup())

  // Window Controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

  // Graceful AI stream handler (for inline "Improve writing" ghost preview)
  ipcMain.handle(
    'ai:chatCompletionStream',
    async (event, streamId: string, _systemPrompt: string, messages: { role: string; content: string }[]) => {
      // If user tries inline "Improve writing", simulate a clean rewrite stream
      const userMessage = messages[messages.length - 1]?.content ?? ''
      const sender = event.sender

      // Send start event
      sender.send(`ai:stream:${streamId}`, { type: 'start' })

      // Generate a refined output based on the user prompt
      const textToRefine = userMessage.replace(/^.*?Here is the content:\s*/s, '').trim()
      const refinedText = textToRefine
        ? textToRefine
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .join('\n\n')
        : 'Improved note text.'

      // Stream words
      const words = refinedText.split(' ')
      let current = ''
      for (const word of words) {
        current += (current ? ' ' : '') + word
        sender.send(`ai:stream:${streamId}`, {
          type: 'chunk',
          text: (current ? ' ' : '') + word,
          accumulated: current
        })
        await new Promise((r) => setTimeout(r, 20))
      }

      sender.send(`ai:stream:${streamId}`, { type: 'done', text: current })
      return { success: true }
    }
  )

  ipcMain.handle('ai:cancelStream', (_, streamId: string) => {
    mainWindow?.webContents.send(`ai:stream:${streamId}`, { type: 'canceled' })
    return { success: true }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mynotes.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  DatabaseService.getDb()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
