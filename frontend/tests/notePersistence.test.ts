import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from '../store/useNotesStore'
import type { Note } from '../types/notes'

vi.mock('../components/ui/confirm', () => ({ confirmDialog: vi.fn().mockResolvedValue(true) }))
vi.mock('../components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const note: Note = { id: 'note', title: 'Original', content: '', createdAt: '', updatedAt: '' }

afterEach(() => {
  vi.unstubAllGlobals()
  useNotesStore.setState({ notes: [], notesLoadError: null })
})

describe('note persistence', () => {
  it('persists notebook deletion with all descendants removed', async () => {
    const save = vi.fn().mockResolvedValue({ success: true })
    vi.stubGlobal('window', { api: { notes: { save } } })
    const child = { ...note, id: 'child', parentId: note.id }
    const grandchild = { ...note, id: 'grandchild', parentId: child.id }
    const keep = { ...note, id: 'keep' }
    useNotesStore.setState({ notes: [note, child, grandchild, keep], selectedNoteId: child.id })
    await useNotesStore.getState().deleteNote(note.id)
    expect(save).toHaveBeenCalledWith([keep])
    expect(useNotesStore.getState().notes).toEqual([keep])
    expect(useNotesStore.getState().selectedNoteId).toBe(keep.id)
  })
  it('persists an empty vault when bulk deleting the last notes', async () => {
    const save = vi.fn().mockResolvedValue({ success: true })
    vi.stubGlobal('window', { api: { notes: { save } } })
    useNotesStore.setState({ notes: [note], selectedNoteId: note.id })
    await useNotesStore.getState().deleteNotes([note.id], true)
    expect(save).toHaveBeenCalledWith([])
    expect(useNotesStore.getState().notes).toEqual([])
    expect(useNotesStore.getState().selectedNoteId).toBeNull()
  })
  it('restores visible notes when deletion cannot be saved', async () => {
    const save = vi.fn().mockResolvedValue({ success: false, error: 'Disk full' })
    vi.stubGlobal('window', { api: { notes: { save } } })
    useNotesStore.setState({ notes: [note], selectedNoteId: note.id })
    await useNotesStore.getState().deleteNote(note.id)
    expect(useNotesStore.getState().notes).toEqual([note])
    expect(useNotesStore.getState().selectedNoteId).toBe(note.id)
  })
  it('reports a failed database response while retaining edits for retry', async () => {
    const save = vi.fn().mockResolvedValue({ success: false, error: 'Disk full' })
    vi.stubGlobal('window', { api: { notes: { save } } })
    useNotesStore.setState({ notes: [note] })
    expect(await useNotesStore.getState().updateNote(note.id, { title: 'Edited' })).toBe(false)
    expect(useNotesStore.getState().notes[0].title).toBe('Edited')
    save.mockResolvedValue({ success: true })
    expect(await useNotesStore.getState().updateNote(note.id, { title: 'Edited' })).toBe(true)
  })
  it('handles a rejected IPC call', async () => {
    vi.stubGlobal('window', {
      api: { notes: { save: vi.fn().mockRejectedValue(new Error('Unavailable')) } }
    })
    useNotesStore.setState({ notes: [note] })
    expect(await useNotesStore.getState().updateNote(note.id, { content: 'Keep this text' })).toBe(
      false
    )
    expect(useNotesStore.getState().notes[0].content).toBe('Keep this text')
  })
  it('does not write a partial vault after notes failed to load', async () => {
    const save = vi.fn()
    vi.stubGlobal('window', { api: { notes: { save } } })
    useNotesStore.setState({ notes: [note], notesLoadError: 'Database unavailable' })
    expect(await useNotesStore.getState().updateNote(note.id, { title: 'Edited' })).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })
})
