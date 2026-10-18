import { execFile } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { app, dialog } from 'electron'
import TurndownService from 'turndown'
import type { NoteImportResult } from '../types'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
})

export class ImportService {
  static async importLocalFile(): Promise<NoteImportResult | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Import Notes (OneNote, HTML, TXT, Markdown)',
      filters: [
        {
          name: 'Note Files',
          extensions: ['one', 'onex', 'onepkg', 'txt', 'md', 'markdown', 'html', 'htm']
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const ext = extname(filePath).toLowerCase()

    // OneNote binary formats
    if (['.one', '.onex', '.onepkg'].includes(ext)) {
      try {
        let scriptPath = join(app.getAppPath(), 'resources/extract_onenote.py')
        if (scriptPath.includes('app.asar')) {
          scriptPath = scriptPath.replace('app.asar', 'app.asar.unpacked')
        }
        if (!existsSync(scriptPath)) {
          scriptPath = join(process.resourcesPath, 'resources/extract_onenote.py')
        }
        if (!existsSync(scriptPath)) {
          scriptPath = join(process.resourcesPath, 'extract_onenote.py')
        }

        if (!existsSync(scriptPath)) {
          return {
            error:
              'OneNote extractor script was not found. Please ensure resources/extract_onenote.py exists.'
          }
        }

        return new Promise<NoteImportResult>((resolve) => {
          execFile(
            'python3',
            [scriptPath, filePath],
            { maxBuffer: 1024 * 1024 * 10 },
            (error, stdout, _stderr) => {
              if (error) {
                // Try fallback python
                execFile(
                  'python',
                  [scriptPath, filePath],
                  { maxBuffer: 1024 * 1024 * 10 },
                  (err2, stdout2, stderr2) => {
                    if (err2) {
                      resolve({
                        error: `Failed to extract OneNote content. Ensure Python with onenote extractor is available. (${stderr2 || err2.message})`
                      })
                      return
                    }
                    try {
                      const pages = JSON.parse(stdout2) as { title: string; content: string }[]
                      resolve({ type: 'pages', pages })
                    } catch (parseErr: unknown) {
                      resolve({ error: `Failed to parse extracted JSON: ${String(parseErr)}` })
                    }
                  }
                )
                return
              }

              try {
                const pages = JSON.parse(stdout) as { title: string; content: string }[]
                resolve({
                  type: 'pages',
                  pages
                })
              } catch (parseErr: unknown) {
                resolve({
                  error: `Failed to parse extracted JSON: ${String(parseErr)}`
                })
              }
            }
          )
        })
      } catch (err: unknown) {
        return {
          error: `Error setting up OneNote import process: ${err instanceof Error ? err.message : String(err)}`
        }
      }
    }

    // Standard text and markup formats
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const title = basename(filePath, ext)

      if (ext === '.html' || ext === '.htm') {
        const markdown = turndown.turndown(raw)
        return {
          type: 'single',
          title,
          content: markdown,
          format: 'markdown'
        }
      }

      return {
        type: 'single',
        title,
        content: raw,
        format: 'markdown'
      }
    } catch (e: unknown) {
      return {
        error: e instanceof Error ? e.message : String(e)
      }
    }
  }
}
