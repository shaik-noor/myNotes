import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { generateKeyBetween } from 'fractional-indexing'
import type { AppSettings, BackupManifest, Note, NoteAttachmentRow } from '../types'

interface NoteRow {
  id: string
  caseId: string | null
  caseNumber: string | null
  title: string | null
  content: string | null
  createdAt: string | null
  updatedAt: string | null
  icon: string | null
  coverImage: string | null
  pinned: number | null
  tags: string | null
  fullWidth: number | null
  parentId: string | null
  sortKey: string | null
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  palette: 'blue',
  fontClass: 'font-sans-editor',
  fullWidthDefault: false,
  autoSaveDelay: 800
}

export class DatabaseService {
  private static db: Database.Database | null = null

  static getDb(): Database.Database {
    if (!DatabaseService.db) {
      const dbPath = join(app.getPath('userData'), 'mynotes.db')
      DatabaseService.db = new Database(dbPath)
      DatabaseService.db.pragma('journal_mode = WAL')
      DatabaseService.db.pragma('foreign_keys = ON')
      DatabaseService.initSchema()
    }
    return DatabaseService.db
  }

  private static initSchema(): void {
    const db = DatabaseService.db!
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        caseId TEXT,
        caseNumber TEXT,
        title TEXT,
        content TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        icon TEXT,
        coverImage TEXT,
        pinned INTEGER,
        tags TEXT,
        fullWidth INTEGER,
        parentId TEXT,
        sortKey TEXT,
        FOREIGN KEY (parentId) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS note_links (
        id TEXT PRIMARY KEY,
        sourceNoteId TEXT NOT NULL,
        targetNoteId TEXT NOT NULL,
        FOREIGN KEY (sourceNoteId) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (targetNoteId) REFERENCES notes(id) ON DELETE CASCADE,
        UNIQUE (sourceNoteId, targetNoteId)
      );

      CREATE TABLE IF NOT EXISTS note_attachments (
        id TEXT PRIMARY KEY,
        noteId TEXT,
        name TEXT,
        kind TEXT,
        ext TEXT,
        mime TEXT,
        size INTEGER,
        data TEXT,
        createdAt TEXT,
        FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS cloud_sync (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parentId);
      CREATE INDEX IF NOT EXISTS idx_notes_sort ON notes(sortKey);
      CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(sourceNoteId);
      CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(targetNoteId);
      CREATE INDEX IF NOT EXISTS idx_note_attachments_note ON note_attachments(noteId);
    `)
  }

  static decodeNoteRow(row: NoteRow): Note {
    let tags: string[] | undefined
    if (row.tags) {
      try {
        const parsed = JSON.parse(row.tags)
        if (Array.isArray(parsed)) {
          tags = parsed.filter((t): t is string => typeof t === 'string')
        }
      } catch {
        // Fall back to no tags on parse failure
      }
    }

    return {
      id: row.id,
      caseId: row.caseId ?? '',
      caseNumber: row.caseNumber ?? '',
      title: row.title ?? '',
      content: row.content ?? '',
      createdAt: row.createdAt ?? '',
      updatedAt: row.updatedAt ?? '',
      icon: row.icon ?? undefined,
      coverImage: row.coverImage ?? undefined,
      pinned: row.pinned === 1 ? true : undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
      fullWidth: row.fullWidth === 1 ? true : undefined,
      parentId: row.parentId ?? undefined,
      sortKey: row.sortKey ?? undefined
    }
  }

  private static encodeNoteRow(n: Note): NoteRow {
    return {
      id: n.id,
      caseId: n.caseId ?? null,
      caseNumber: n.caseNumber ?? null,
      title: n.title ?? '',
      content: n.content ?? '',
      createdAt: n.createdAt ?? new Date().toISOString(),
      updatedAt: n.updatedAt ?? new Date().toISOString(),
      icon: n.icon ?? null,
      coverImage: n.coverImage ?? null,
      pinned: n.pinned ? 1 : 0,
      tags: n.tags && n.tags.length > 0 ? JSON.stringify(n.tags) : null,
      fullWidth: n.fullWidth ? 1 : 0,
      parentId: n.parentId ?? null,
      sortKey: n.sortKey ?? null
    }
  }

  static loadNotes(): Note[] {
    const db = DatabaseService.getDb()
    const rows = db.prepare('SELECT * FROM notes').all() as NoteRow[]
    return rows.map((r) => DatabaseService.decodeNoteRow(r))
  }

  static extractLinkTargets(content: string): string[] {
    const targets = new Set<string>()
    // Match both mynotes:<id> and legacy mydesk-note:<id>
    const linkPattern = /(?:mynotes|mydesk-note):([A-Za-z0-9_-]+)/g
    let match: RegExpExecArray | null
    while ((match = linkPattern.exec(content)) !== null) {
      targets.add(match[1])
    }
    return Array.from(targets)
  }

  static reconcileNoteLinks(sourceNoteId: string, content: string): void {
    const db = DatabaseService.getDb()
    try {
      db.prepare('DELETE FROM note_links WHERE sourceNoteId = ?').run(sourceNoteId)
      const targets = DatabaseService.extractLinkTargets(content)
      if (targets.length === 0) return

      const nonSelf = targets.filter((t) => t !== sourceNoteId)
      if (nonSelf.length === 0) return

      const placeholders = nonSelf.map(() => '?').join(',')
      const existing = db
        .prepare(`SELECT id FROM notes WHERE id IN (${placeholders})`)
        .all(...nonSelf) as { id: string }[]
      const existingSet = new Set(existing.map((e) => e.id))
      const validTargets = nonSelf.filter((t) => existingSet.has(t))

      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO note_links (id, sourceNoteId, targetNoteId)
        VALUES (?, ?, ?)
      `)

      for (const targetId of validTargets) {
        const id = randomBytes(4).toString('hex')
        insertStmt.run(id, sourceNoteId, targetId)
      }
    } catch (e) {
      console.error(`Failed to reconcile links for note ${sourceNoteId}:`, e)
    }
  }

  static saveNotes(notesList: Note[]): void {
    const db = DatabaseService.getDb()
    const transaction = db.transaction((items: Note[]) => {
      const upsertStmt = db.prepare(`
        INSERT INTO notes (
          id, caseId, caseNumber, title, content, createdAt, updatedAt,
          icon, coverImage, pinned, tags, fullWidth, parentId, sortKey
        ) VALUES (
          @id, @caseId, @caseNumber, @title, @content, @createdAt, @updatedAt,
          @icon, @coverImage, @pinned, @tags, @fullWidth, @parentId, @sortKey
        ) ON CONFLICT(id) DO UPDATE SET
          caseId = excluded.caseId,
          caseNumber = excluded.caseNumber,
          title = excluded.title,
          content = excluded.content,
          createdAt = excluded.createdAt,
          updatedAt = excluded.updatedAt,
          icon = excluded.icon,
          coverImage = excluded.coverImage,
          pinned = excluded.pinned,
          tags = excluded.tags,
          fullWidth = excluded.fullWidth,
          parentId = excluded.parentId,
          sortKey = excluded.sortKey
      `)

      for (const item of items) {
        upsertStmt.run(DatabaseService.encodeNoteRow(item))
      }

      const incomingIds = items.map((n) => n.id)
      if (incomingIds.length > 0) {
        const placeholders = incomingIds.map(() => '?').join(',')
        db.prepare(`DELETE FROM notes WHERE id NOT IN (${placeholders})`).run(...incomingIds)
      } else {
        db.prepare('DELETE FROM notes').run()
      }

      for (const note of items) {
        DatabaseService.reconcileNoteLinks(note.id, note.content)
      }
    })

    transaction(notesList)
  }

  static moveNote(
    id: string,
    newParentId: string | null,
    prevSiblingSortKey: string | null,
    nextSiblingSortKey: string | null
  ): { id: string; parentId: string | null; sortKey: string } {
    const db = DatabaseService.getDb()

    // Cycle check: moving into self or descendant
    if (newParentId !== null) {
      if (newParentId === id) {
        throw new Error('Cannot move a page into itself')
      }
      const ancestors = new Set<string>()
      let current: string | null = newParentId
      while (current !== null) {
        if (current === id) {
          throw new Error('Cannot move a page into its own descendant')
        }
        if (ancestors.has(current)) break
        ancestors.add(current)
        const row = db.prepare('SELECT parentId FROM notes WHERE id = ?').get(current) as
          | { parentId: string | null }
          | undefined
        current = row?.parentId ?? null
      }
    }

    const sortKey = generateKeyBetween(prevSiblingSortKey, nextSiblingSortKey)
    const now = new Date().toISOString()
    db.prepare('UPDATE notes SET parentId = ?, sortKey = ?, updatedAt = ? WHERE id = ?').run(
      newParentId,
      sortKey,
      now,
      id
    )

    return { id, parentId: newParentId, sortKey }
  }

  static getBacklinks(
    noteId: string
  ): Array<{ id: string; title: string; icon: string | null; parentId: string | null }> {
    const db = DatabaseService.getDb()
    const rows = db
      .prepare(
        `SELECT n.id, n.title, n.icon, n.parentId
         FROM note_links l
         JOIN notes n ON n.id = l.sourceNoteId
         WHERE l.targetNoteId = ?
         ORDER BY n.updatedAt DESC`
      )
      .all(noteId) as Array<{
      id: string
      title: string | null
      icon: string | null
      parentId: string | null
    }>

    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? 'Untitled',
      icon: r.icon,
      parentId: r.parentId
    }))
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  static getSettings(): AppSettings {
    const db = DatabaseService.getDb()
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('app_settings') as
        | { value: string }
        | undefined
      if (row?.value) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
    return DEFAULT_SETTINGS
  }

  static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const db = DatabaseService.getDb()
    const current = DatabaseService.getSettings()
    const updated = { ...current, ...settings }
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('app_settings', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(updated))
    return updated
  }

  // ── Attachments DB persistence ───────────────────────────────────────────
  static saveNoteAttachment(row: NoteAttachmentRow): void {
    const db = DatabaseService.getDb()
    db.prepare(`
      INSERT INTO note_attachments (id, noteId, name, kind, ext, mime, size, data, createdAt)
      VALUES (@id, @noteId, @name, @kind, @ext, @mime, @size, @data, @createdAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        ext = excluded.ext,
        mime = excluded.mime,
        size = excluded.size,
        data = excluded.data
    `).run(row)
  }

  static getNoteAttachment(id: string): NoteAttachmentRow | null {
    const db = DatabaseService.getDb()
    const row = db.prepare('SELECT * FROM note_attachments WHERE id = ?').get(id) as
      | NoteAttachmentRow
      | undefined
    return row ?? null
  }

  static listNoteAttachments(noteId: string): NoteAttachmentRow[] {
    const db = DatabaseService.getDb()
    return db
      .prepare('SELECT * FROM note_attachments WHERE noteId = ? ORDER BY createdAt DESC')
      .all(noteId) as NoteAttachmentRow[]
  }

  static deleteNoteAttachment(id: string): void {
    const db = DatabaseService.getDb()
    db.prepare('DELETE FROM note_attachments WHERE id = ?').run(id)
  }

  // ── Backup & Restore ─────────────────────────────────────────────────────
  static exportBackup(): BackupManifest {
    const notes = DatabaseService.loadNotes()
    const db = DatabaseService.getDb()
    const allAttachments = db.prepare('SELECT * FROM note_attachments').all() as NoteAttachmentRow[]

    const noteAttachments: Record<string, NoteAttachmentRow[]> = {}
    for (const att of allAttachments) {
      if (att.noteId) {
        if (!noteAttachments[att.noteId]) noteAttachments[att.noteId] = []
        noteAttachments[att.noteId].push(att)
      }
    }

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      notes,
      noteAttachments,
      settings: DatabaseService.getSettings()
    }
  }

  static importBackup(manifest: BackupManifest): void {
    const db = DatabaseService.getDb()
    const transaction = db.transaction(() => {
      if (manifest.notes && Array.isArray(manifest.notes)) {
        DatabaseService.saveNotes(manifest.notes)
      }

      if (manifest.noteAttachments) {
        db.prepare('DELETE FROM note_attachments').run()
        const insertAtt = db.prepare(`
          INSERT INTO note_attachments (id, noteId, name, kind, ext, mime, size, data, createdAt)
          VALUES (@id, @noteId, @name, @kind, @ext, @mime, @size, @data, @createdAt)
        `)
        for (const attList of Object.values(manifest.noteAttachments)) {
          for (const att of attList) {
            insertAtt.run(att)
          }
        }
      }

      if (manifest.settings) {
        DatabaseService.saveSettings(manifest.settings)
      }
    })

    transaction()
  }

  static getCloudSyncValue(key: string): string | null {
    const db = DatabaseService.getDb()
    const row = db.prepare('SELECT value FROM cloud_sync WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row ? row.value : null
  }

  static setCloudSyncValue(key: string, value: string | null): void {
    const db = DatabaseService.getDb()
    if (value === null) {
      db.prepare('DELETE FROM cloud_sync WHERE key = ?').run(key)
    } else {
      db.prepare(
        'INSERT INTO cloud_sync (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(key, value)
    }
  }

  static clearCloudSync(): void {
    const db = DatabaseService.getDb()
    db.prepare('DELETE FROM cloud_sync').run()
  }

  static mergeVaultFromCloud(remoteManifest: BackupManifest): {
    notesCount: number
    changed: boolean
  } {
    const localManifest = DatabaseService.exportBackup()
    const localNotesMap = new Map<string, Note>(localManifest.notes.map((n) => [n.id, n]))
    const remoteNotes = remoteManifest.notes || []

    let changed = false
    const mergedNotes: Note[] = []
    const processedIds = new Set<string>()

    // Compare remote notes with local notes
    for (const rNote of remoteNotes) {
      processedIds.add(rNote.id)
      const lNote = localNotesMap.get(rNote.id)
      if (!lNote) {
        // Remote note is new
        mergedNotes.push(rNote)
        changed = true
      } else {
        const rTime = new Date(rNote.updatedAt || 0).getTime()
        const lTime = new Date(lNote.updatedAt || 0).getTime()
        if (rTime > lTime) {
          mergedNotes.push(rNote)
          changed = true
        } else {
          mergedNotes.push(lNote)
        }
      }
    }

    // Preserve any local notes not yet in remote
    for (const [id, lNote] of localNotesMap) {
      if (!processedIds.has(id)) {
        mergedNotes.push(lNote)
      }
    }

    if (changed) {
      DatabaseService.saveNotes(mergedNotes)
    }

    // Merge attachments if provided
    if (remoteManifest.noteAttachments) {
      const db = DatabaseService.getDb()
      const existingAttachmentIds = new Set(
        (db.prepare('SELECT id FROM note_attachments').all() as { id: string }[]).map((a) => a.id)
      )
      const insertAtt = db.prepare(`
        INSERT INTO note_attachments (id, noteId, name, kind, ext, mime, size, data, createdAt)
        VALUES (@id, @noteId, @name, @kind, @ext, @mime, @size, @data, @createdAt)
      `)
      for (const attList of Object.values(remoteManifest.noteAttachments)) {
        for (const att of attList) {
          if (!existingAttachmentIds.has(att.id)) {
            try {
              insertAtt.run(att)
              changed = true
            } catch (e) {
              console.error('Error inserting synced attachment:', e)
            }
          }
        }
      }
    }

    return { notesCount: mergedNotes.length, changed }
  }
}
