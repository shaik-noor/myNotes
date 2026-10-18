import { randomBytes } from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { app, dialog, shell } from 'electron'
import type { NoteAttachment, NoteAttachmentKind, NoteAttachmentRow } from '../types'
import { DatabaseService } from './databaseService'

export class NoteAttachmentService {
  private static readonly MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

  private static readonly TEXT_EXTS = new Set([
    'txt', 'md', 'markdown', 'json', 'yaml', 'yml', 'xml', 'html', 'htm', 'css',
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs',
    'rb', 'php', 'sh', 'bash', 'sql', 'ini', 'conf', 'toml', 'log', 'csv'
  ])

  private static readonly IMAGE_EXTS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tif', 'tiff'
  ])

  private static readonly MIME_BY_EXT: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html'
  }

  private static classifyKind(ext: string): NoteAttachmentKind {
    if (NoteAttachmentService.IMAGE_EXTS.has(ext)) return 'image'
    if (NoteAttachmentService.TEXT_EXTS.has(ext)) return 'text'
    return 'binary'
  }

  private static guessMime(ext: string): string {
    return NoteAttachmentService.MIME_BY_EXT[ext] ?? 'application/octet-stream'
  }

  private static stagingDir(noteId: string): string {
    return join(app.getPath('userData'), 'note-attachments', noteId)
  }

  private static sanitizeName(name: string): string {
    const cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim()
    return cleaned || 'attachment'
  }

  private static async ensureDiskMirror(
    noteId: string,
    name: string,
    bytes: Buffer
  ): Promise<string> {
    const dir = NoteAttachmentService.stagingDir(noteId)
    await fs.mkdir(dir, { recursive: true })
    const target = join(dir, name)
    await fs.writeFile(target, bytes)
    return target
  }

  private static async materializeRow(row: NoteAttachmentRow): Promise<string | null> {
    if (!row.noteId || !row.name || !row.data) return null
    const dir = NoteAttachmentService.stagingDir(row.noteId)
    const target = join(dir, row.name)
    if (existsSync(target)) return target

    try {
      await fs.mkdir(dir, { recursive: true })
      const bytes = Buffer.from(row.data, 'base64')
      await fs.writeFile(target, bytes)
      return target
    } catch (e) {
      console.error(`Failed to materialize note attachment ${row.id}:`, e)
      return null
    }
  }

  static async pickAndStage(noteId: string): Promise<NoteAttachment[]> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Attach files to note',
      properties: ['openFile', 'multiSelections']
    })
    if (canceled || filePaths.length === 0) return []
    return NoteAttachmentService.stageFromPaths(noteId, filePaths)
  }

  static async stageFromPaths(noteId: string, paths: string[]): Promise<NoteAttachment[]> {
    const results: NoteAttachment[] = []

    for (const filePath of paths) {
      const rawName = basename(filePath)
      const name = NoteAttachmentService.sanitizeName(rawName)
      const ext = extname(name).replace(/^\./, '').toLowerCase()
      const kind = NoteAttachmentService.classifyKind(ext)
      const mime = NoteAttachmentService.guessMime(ext)

      try {
        const stat = await fs.stat(filePath)
        if (stat.size > NoteAttachmentService.MAX_ATTACHMENT_BYTES) {
          results.push({
            name,
            size: stat.size,
            kind,
            ext,
            mime,
            error: `File exceeds 25 MB cap (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`
          })
          continue
        }

        const bytes = await fs.readFile(filePath)
        const id = randomBytes(8).toString('hex')
        const stagedPath = await NoteAttachmentService.ensureDiskMirror(noteId, name, bytes)

        const row: NoteAttachmentRow = {
          id,
          noteId,
          name,
          kind,
          ext,
          mime,
          size: stat.size,
          data: bytes.toString('base64'),
          createdAt: new Date().toISOString()
        }
        DatabaseService.saveNoteAttachment(row)

        const previewDataUrl =
          kind === 'image' ? `data:${mime};base64,${row.data}` : undefined

        results.push({
          id,
          noteId,
          name,
          size: stat.size,
          kind,
          ext,
          mime,
          path: stagedPath,
          previewDataUrl,
          createdAt: row.createdAt ?? undefined
        })
      } catch (err: unknown) {
        results.push({
          name,
          size: 0,
          kind,
          ext,
          mime,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    return results
  }

  static async stageFromBytes(
    noteId: string,
    name: string,
    bytes: Buffer
  ): Promise<NoteAttachment> {
    const safeName = NoteAttachmentService.sanitizeName(name)
    const ext = extname(safeName).replace(/^\./, '').toLowerCase() || 'png'
    const kind = NoteAttachmentService.classifyKind(ext)
    const mime = NoteAttachmentService.guessMime(ext)

    if (bytes.length > NoteAttachmentService.MAX_ATTACHMENT_BYTES) {
      return {
        name: safeName,
        size: bytes.length,
        kind,
        ext,
        mime,
        error: `Attachment exceeds 25 MB cap (${(bytes.length / (1024 * 1024)).toFixed(1)} MB)`
      }
    }

    const id = randomBytes(8).toString('hex')
    const stagedPath = await NoteAttachmentService.ensureDiskMirror(noteId, safeName, bytes)
    const base64 = bytes.toString('base64')

    const row: NoteAttachmentRow = {
      id,
      noteId,
      name: safeName,
      kind,
      ext,
      mime,
      size: bytes.length,
      data: base64,
      createdAt: new Date().toISOString()
    }
    DatabaseService.saveNoteAttachment(row)

    return {
      id,
      noteId,
      name: safeName,
      size: bytes.length,
      kind,
      ext,
      mime,
      path: stagedPath,
      previewDataUrl: kind === 'image' ? `data:${mime};base64,${base64}` : undefined,
      createdAt: row.createdAt ?? undefined
    }
  }

  static async list(noteId: string): Promise<NoteAttachment[]> {
    const rows = DatabaseService.listNoteAttachments(noteId)
    const items: NoteAttachment[] = []

    for (const r of rows) {
      const ext = r.ext ?? ''
      const kind = (r.kind as NoteAttachmentKind) ?? NoteAttachmentService.classifyKind(ext)
      const mime = r.mime ?? NoteAttachmentService.guessMime(ext)
      const path = await NoteAttachmentService.materializeRow(r)

      items.push({
        id: r.id,
        noteId: r.noteId ?? undefined,
        name: r.name ?? 'attachment',
        size: r.size ?? 0,
        kind,
        ext,
        mime,
        path: path ?? undefined,
        createdAt: r.createdAt ?? undefined
      })
    }

    return items
  }

  static async getDataUrl(id: string): Promise<{ mime: string; dataUrl: string } | null> {
    const row = DatabaseService.getNoteAttachment(id)
    if (!row?.data) return null
    const mime = row.mime ?? NoteAttachmentService.guessMime(row.ext ?? '')
    return {
      mime,
      dataUrl: `data:${mime};base64,${row.data}`
    }
  }

  static async saveAs(id: string): Promise<string | null> {
    const row = DatabaseService.getNoteAttachment(id)
    if (!row?.data) return null

    const defaultName = row.name ?? 'attachment'
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save attachment',
      defaultPath: defaultName
    })
    if (canceled || !filePath) return null

    const bytes = Buffer.from(row.data, 'base64')
    await fs.writeFile(filePath, bytes)
    return filePath
  }

  static async open(id: string): Promise<boolean> {
    const row = DatabaseService.getNoteAttachment(id)
    if (!row) return false
    const path = await NoteAttachmentService.materializeRow(row)
    if (!path) return false
    const res = await shell.openPath(path)
    return res === ''
  }

  static async reveal(id: string): Promise<boolean> {
    const row = DatabaseService.getNoteAttachment(id)
    if (!row) return false
    const path = await NoteAttachmentService.materializeRow(row)
    if (!path) return false
    shell.showItemInFolder(path)
    return true
  }

  static async remove(id: string): Promise<boolean> {
    const row = DatabaseService.getNoteAttachment(id)
    if (!row) return false
    DatabaseService.deleteNoteAttachment(id)

    if (row.noteId && row.name) {
      const diskPath = join(NoteAttachmentService.stagingDir(row.noteId), row.name)
      if (existsSync(diskPath)) {
        await fs.unlink(diskPath).catch(() => {})
      }
    }

    return true
  }
}

