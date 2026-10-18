import { promises as fs } from 'node:fs'
import { dialog } from 'electron'
import type { BackupManifest, Result } from '../types'
import { DatabaseService } from './databaseService'

export class BackupService {
  static async exportBackup(): Promise<Result<string>> {
    try {
      const manifest = DatabaseService.exportBackup()
      const dateStr = new Date().toISOString().split('T')[0]
      const defaultFilename = `myNotes-backup-${dateStr}.json`

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Notes Backup',
        defaultPath: defaultFilename,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })

      if (canceled || !filePath) {
        return { success: false, error: 'Canceled by user' }
      }

      await fs.writeFile(filePath, JSON.stringify(manifest, null, 2), 'utf-8')
      return { success: true, data: filePath }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  static async importBackup(): Promise<Result<{ noteCount: number }>> {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Restore Notes Backup',
        properties: ['openFile'],
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      })

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Canceled by user' }
      }

      const raw = await fs.readFile(filePaths[0], 'utf-8')
      const manifest = JSON.parse(raw) as BackupManifest

      if (!manifest.notes || !Array.isArray(manifest.notes)) {
        return { success: false, error: 'Invalid backup file: notes array missing' }
      }

      DatabaseService.importBackup(manifest)
      return { success: true, data: { noteCount: manifest.notes.length } }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }
}
