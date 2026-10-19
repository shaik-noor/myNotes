import { describe, expect, it } from 'vitest'
import type { Note } from '../types/notes'

function mergeNotesLWW(
  localNotes: Note[],
  remoteNotes: Note[]
): { merged: Note[]; changed: boolean } {
  const localMap = new Map<string, Note>(localNotes.map((n) => [n.id, n]))
  let changed = false
  const merged: Note[] = []
  const processed = new Set<string>()

  for (const rNote of remoteNotes) {
    processed.add(rNote.id)
    const lNote = localMap.get(rNote.id)
    if (!lNote) {
      merged.push(rNote)
      changed = true
    } else {
      const rTime = new Date(rNote.updatedAt || 0).getTime()
      const lTime = new Date(lNote.updatedAt || 0).getTime()
      if (rTime > lTime) {
        merged.push(rNote)
        changed = true
      } else {
        merged.push(lNote)
      }
    }
  }

  for (const [id, lNote] of localMap) {
    if (!processed.has(id)) {
      merged.push(lNote)
    }
  }

  return { merged, changed }
}

describe('Cloud Sync LWW (Last-Write-Wins) Resolution', () => {
  it('prefers the remote note if remote updatedAt is newer', () => {
    const local: Note[] = [
      {
        id: 'note-1',
        title: 'Desktop Edit',
        content: 'Old desktop content',
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T12:00:00Z'
      }
    ]
    const remote: Note[] = [
      {
        id: 'note-1',
        title: 'Mobile Edit',
        content: 'Newer mobile content',
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T14:30:00Z'
      }
    ]

    const result = mergeNotesLWW(local, remote)
    expect(result.changed).toBe(true)
    expect(result.merged.length).toBe(1)
    expect(result.merged[0].title).toBe('Mobile Edit')
    expect(result.merged[0].content).toBe('Newer mobile content')
  })

  it('keeps local note if local updatedAt is newer', () => {
    const local: Note[] = [
      {
        id: 'note-1',
        title: 'Fresh Desktop Edit',
        content: 'Desktop updated last',
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T16:00:00Z'
      }
    ]
    const remote: Note[] = [
      {
        id: 'note-1',
        title: 'Stale Mobile Edit',
        content: 'Mobile edited earlier',
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T14:30:00Z'
      }
    ]

    const result = mergeNotesLWW(local, remote)
    expect(result.changed).toBe(false)
    expect(result.merged[0].title).toBe('Fresh Desktop Edit')
  })

  it('merges new notes created remotely without losing local notes', () => {
    const local: Note[] = [
      {
        id: 'local-only',
        title: 'Local Only',
        content: 'Draft',
        createdAt: '2026-10-18T10:00:00Z',
        updatedAt: '2026-10-18T10:00:00Z'
      }
    ]
    const remote: Note[] = [
      {
        id: 'remote-only',
        title: 'Created on Mobile',
        content: 'Mobile note',
        createdAt: '2026-10-18T11:00:00Z',
        updatedAt: '2026-10-18T11:00:00Z'
      }
    ]

    const result = mergeNotesLWW(local, remote)
    expect(result.changed).toBe(true)
    expect(result.merged.length).toBe(2)
    expect(result.merged.map((n) => n.id)).toContain('local-only')
    expect(result.merged.map((n) => n.id)).toContain('remote-only')
  })
})
