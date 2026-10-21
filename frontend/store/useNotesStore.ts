import { create } from 'zustand'
import { confirmDialog } from '../components/ui/confirm'
import { toast } from '../components/ui/toast'
import type { BacklinkItem, Note, NoteTreeNode } from '../types/notes'

async function persistNotes(notes: Note[]): Promise<boolean> {
  if (useNotesStore.getState().notesLoadError) {
    toast.error('Load your notes before making changes')
    return false
  }
  try {
    const result = await window.api.notes.save(notes)
    if (!result.success) throw new Error(result.error || 'Could not save your changes')
    return true
  } catch (error) {
    toast.error('Changes could not be saved', {
      description: error instanceof Error ? error.message : 'Please try again.'
    })
    return false
  }
}

export type { BacklinkItem, Note, NoteTreeNode }

export function getAncestors(
  notes: Note[],
  noteId: string
): Array<{ id: string; title: string; icon?: string | null }> {
  const note = notes.find((n) => n.id === noteId)
  if (!note?.parentId) return []

  const chain: Array<{ id: string; title: string; icon?: string | null }> = []
  const visited = new Set<string>()
  let current: string | null = note.parentId

  while (current && !visited.has(current)) {
    visited.add(current)
    const parent = notes.find((n) => n.id === current)
    if (!parent) break
    chain.unshift({ id: parent.id, title: parent.title || 'Untitled', icon: parent.icon })
    current = parent.parentId ?? null
  }

  return chain
}

export function getDescendantIds(notes: Note[], noteId: string): string[] {
  const result: string[] = []
  const queue = [noteId]
  const visited = new Set<string>([noteId])

  while (queue.length > 0) {
    const parentId = queue.shift()
    for (const note of notes) {
      if (note.parentId === parentId && !visited.has(note.id)) {
        visited.add(note.id)
        result.push(note.id)
        queue.push(note.id)
      }
    }
  }

  return result
}

export function buildNoteTree(notes: Note[]): NoteTreeNode[] {
  const map = new Map<string, NoteTreeNode>()
  const roots: NoteTreeNode[] = []

  // Initialize nodes
  for (const n of notes) {
    map.set(n.id, { ...n, children: [], depth: 0 })
  }

  // Nest children
  for (const n of notes) {
    const node = map.get(n.id)
    if (!node) continue
    const parent = n.parentId ? map.get(n.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Set depths and sort
  const sortAndSetDepth = (nodes: NoteTreeNode[], depth: number): void => {
    nodes.sort((a, b) => {
      // Pinned first at root level
      if (depth === 0) {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
      }

      // SortKey if present
      if (a.sortKey && b.sortKey) {
        return a.sortKey.localeCompare(b.sortKey)
      }
      if (a.sortKey) return -1
      if (b.sortKey) return 1

      // Fallback: title then createdAt
      const titleCompare = (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
      if (titleCompare !== 0) return titleCompare
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })

    for (const node of nodes) {
      node.depth = depth
      if (node.children.length > 0) {
        sortAndSetDepth(node.children, depth + 1)
      }
    }
  }

  sortAndSetDepth(roots, 0)
  return roots
}

export type HomeTab = 'notes' | 'templates' | 'scratchpad' | 'tasks'

interface NotesState {
  notes: Note[]
  notesLoaded: boolean
  notesLoadError: string | null
  selectedNoteId: string | null
  activeHomeTab: HomeTab
  notesSearchQuery: string
  expandedNoteIds: Set<string>
  navigationHistory: Array<{ selectedNoteId: string | null }>
  navigationIndex: number

  loadNotes: () => Promise<void>
  setSelectedNoteId: (id: string | null) => void
  setActiveHomeTab: (tab: HomeTab) => void
  setNotesSearchQuery: (query: string) => void
  toggleNoteExpanded: (id: string) => void
  setNoteExpanded: (id: string, expanded: boolean) => void
  expandAncestors: (id: string) => void

  createNote: (
    initialTitle?: string,
    initialParentId?: string | null,
    initialContent?: string,
    options?: { icon?: string; tags?: string[] }
  ) => Promise<string>
  createChildPage: (parentId: string, initialTitle?: string) => Promise<string>
  createLinkedChildPage: (title: string, parentId: string) => Promise<string>
  updateNote: (id: string, updates: Partial<Note>) => Promise<boolean>
  deleteNote: (id: string) => Promise<void>
  deleteNotes: (ids: string[], skipConfirm?: boolean) => Promise<void>
  duplicateNote: (id: string) => Promise<string | null>
  toggleNotePinned: (id: string) => Promise<void>
  moveNote: (
    id: string,
    newParentId: string | null,
    prevSiblingSortKey: string | null,
    nextSiblingSortKey: string | null
  ) => Promise<void>
  importNote: (title: string, content: string, parentId?: string | null) => Promise<string>
  getBacklinks: (noteId: string) => Promise<BacklinkItem[]>

  canGoBack: () => boolean
  canGoForward: () => boolean
  goBack: () => void
  goForward: () => void
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  notesLoaded: false,
  notesLoadError: null,
  selectedNoteId: null,
  activeHomeTab: 'notes',
  setActiveHomeTab: (tab) => set({ activeHomeTab: tab }),
  notesSearchQuery: '',
  expandedNoteIds: new Set<string>(),
  navigationHistory: [],
  navigationIndex: -1,

  loadNotes: async () => {
    try {
      const res = await window.api?.notes?.load?.()
      if (res?.success && Array.isArray(res.data)) {
        const list = res.data
        set({ notes: list, notesLoaded: true, notesLoadError: null })

        // Check if there is a saved note preference or resume state
        const savedNoteId = localStorage.getItem('mynotes:active-note-id')
        if (savedNoteId && list.some((n) => n.id === savedNoteId)) {
          get().setSelectedNoteId(savedNoteId)
        } else if (list.length === 0) {
          get().setSelectedNoteId(null)
        }
      } else {
        set({ notesLoaded: true, notesLoadError: res?.error || 'Could not load your notes' })
      }
    } catch (e) {
      console.error('Failed to load notes:', e)
      set({ notesLoaded: true, notesLoadError: 'Could not load your notes. Please try again.' })
    }
  },

  setSelectedNoteId: (id) => {
    set({ selectedNoteId: id })
    if (id) {
      get().expandAncestors(id)
      try {
        localStorage.setItem('mynotes:active-note-id', id)
      } catch {}
    } else {
      try {
        localStorage.removeItem('mynotes:active-note-id')
      } catch {}
    }

    // Push navigation history
    const { navigationHistory, navigationIndex } = get()
    const trimmed = navigationHistory.slice(0, navigationIndex + 1)
    if (trimmed.length === 0 || trimmed[trimmed.length - 1].selectedNoteId !== id) {
      set({
        navigationHistory: [...trimmed, { selectedNoteId: id }],
        navigationIndex: trimmed.length
      })
    }
  },

  setNotesSearchQuery: (query) => set({ notesSearchQuery: query }),

  toggleNoteExpanded: (id) => {
    const next = new Set(get().expandedNoteIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    set({ expandedNoteIds: next })
  },

  setNoteExpanded: (id, expanded) => {
    const next = new Set(get().expandedNoteIds)
    if (expanded) next.add(id)
    else next.delete(id)
    set({ expandedNoteIds: next })
  },

  expandAncestors: (id) => {
    const ancestors = getAncestors(get().notes, id)
    if (ancestors.length === 0) return
    const next = new Set(get().expandedNoteIds)
    for (const a of ancestors) next.add(a.id)
    set({ expandedNoteIds: next })
  },

  createNote: async (
    initialTitle = 'Untitled',
    initialParentId = null,
    initialContent = '',
    options?: { icon?: string; tags?: string[] }
  ) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const newNote: Note = {
      id,
      title: initialTitle,
      content: initialContent,
      createdAt: now,
      updatedAt: now,
      parentId: initialParentId,
      icon: options?.icon,
      tags: options?.tags
    }

    const updated = [newNote, ...get().notes]
    set({ notes: updated, selectedNoteId: id })
    if (initialParentId) {
      get().setNoteExpanded(initialParentId, true)
    }

    if (!(await persistNotes(updated))) return ''
    return id
  },

  createChildPage: async (parentId: string, initialTitle = 'Untitled') => {
    return get().createNote(initialTitle, parentId)
  },

  createLinkedChildPage: async (title: string, parentId: string) => {
    return get().createNote(title, parentId)
  },

  updateNote: async (id, updates) => {
    const notes = get().notes
    const idx = notes.findIndex((n) => n.id === id)
    if (idx === -1) return false

    const now = new Date().toISOString()
    const updated = [...notes]
    updated[idx] = { ...updated[idx], ...updates, updatedAt: now }

    set({ notes: updated })
    return persistNotes(updated)
  },

  deleteNote: async (id) => {
    const note = get().notes.find((item) => item.id === id)
    if (!note) return
    const count = getDescendantIds(get().notes, id).length
    const ok = await confirmDialog({
      title: count ? 'Delete notebook and pages?' : 'Delete page?',
      description: count
        ? `"${note.title || 'Untitled'}" and ${count} child pages will be permanently deleted.`
        : `"${note.title || 'Untitled'}" will be permanently deleted.`,
      confirmText: 'Delete',
      destructive: true
    })
    if (!ok) return
    const { notes, selectedNoteId } = get()
    const removeIds = new Set([id, ...getDescendantIds(notes, id)])
    const updated = notes.filter((item) => !removeIds.has(item.id))
    const nextSelectedId =
      selectedNoteId && removeIds.has(selectedNoteId) ? (updated[0]?.id ?? null) : selectedNoteId
    set({ notes: updated, selectedNoteId: nextSelectedId })
    if (!(await persistNotes(updated))) {
      if (get().notes === updated) set({ notes, selectedNoteId })
      return
    }
    toast.success('Page deleted')
  },

  deleteNotes: async (ids, skipConfirm = false) => {
    const { notes, selectedNoteId } = get()
    const allIds = new Set(ids)
    for (const id of ids) {
      for (const did of getDescendantIds(notes, id)) {
        allIds.add(did)
      }
    }

    if (!skipConfirm) {
      const ok = await confirmDialog({
        title: `Delete ${allIds.size} note(s)?`,
        description: 'The selected pages and their sub-pages will be permanently deleted.',
        confirmText: 'Delete All',
        destructive: true
      })
      if (!ok) return
    }

    const updated = notes.filter((n) => !allIds.has(n.id))
    let nextSelectedId = selectedNoteId
    if (selectedNoteId && allIds.has(selectedNoteId)) {
      nextSelectedId = updated.length > 0 ? updated[0].id : null
    }

    set({ notes: updated, selectedNoteId: nextSelectedId })
    if (!(await persistNotes(updated))) {
      if (get().notes === updated) set({ notes, selectedNoteId })
      return
    }

    toast.success(`Deleted ${allIds.size} note(s)`)
  },

  duplicateNote: async (id) => {
    const { notes } = get()
    const note = notes.find((n) => n.id === id)
    if (!note) return null

    const now = new Date().toISOString()
    const newId = crypto.randomUUID()
    const copy: Note = {
      ...note,
      id: newId,
      title: `${note.title || 'Untitled'} (Copy)`,
      createdAt: now,
      updatedAt: now
    }

    const idx = notes.findIndex((n) => n.id === id)
    const updated = [...notes.slice(0, idx + 1), copy, ...notes.slice(idx + 1)]

    set({ notes: updated, selectedNoteId: newId })
    if (!(await persistNotes(updated))) return null
    toast.success('Note duplicated')
    return newId
  },

  toggleNotePinned: async (id) => {
    const { notes } = get()
    const note = notes.find((n) => n.id === id)
    if (!note) return

    const nextPinned = !note.pinned
    if (!(await get().updateNote(id, { pinned: nextPinned ? true : undefined }))) return
    toast.success(nextPinned ? 'Pinned to top' : 'Unpinned')
  },

  moveNote: async (id, newParentId, prevSiblingSortKey, nextSiblingSortKey) => {
    const res = await window.api.notes.move(id, newParentId, prevSiblingSortKey, nextSiblingSortKey)
    if (!res.success || !res.data) {
      toast.error('Could not move page', { description: res.error })
      return
    }

    const { sortKey } = res.data
    const notes = get().notes
    const updated = notes.map((n) =>
      n.id === id
        ? {
            ...n,
            parentId: newParentId,
            sortKey,
            updatedAt: new Date().toISOString()
          }
        : n
    )

    set({ notes: updated })
    if (newParentId) {
      get().setNoteExpanded(newParentId, true)
    }
  },

  importNote: async (title, content, parentId = null) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const note: Note = {
      id,
      title: title || 'Untitled Note',
      content: content || '',
      createdAt: now,
      updatedAt: now,
      parentId
    }

    const updated = [note, ...get().notes]
    set({ notes: updated, selectedNoteId: id })
    if (parentId) {
      get().setNoteExpanded(parentId, true)
    }

    if (!(await persistNotes(updated))) return ''
    return id
  },

  getBacklinks: async (noteId) => {
    const res = await window.api.notes.getBacklinks(noteId)
    return res.success && Array.isArray(res.data) ? res.data : []
  },

  canGoBack: () => get().navigationIndex > 0,
  canGoForward: () => get().navigationIndex < get().navigationHistory.length - 1,

  goBack: () => {
    const { navigationHistory, navigationIndex } = get()
    if (navigationIndex > 0) {
      const prev = navigationHistory[navigationIndex - 1]
      set({ selectedNoteId: prev.selectedNoteId, navigationIndex: navigationIndex - 1 })
      if (prev.selectedNoteId) get().expandAncestors(prev.selectedNoteId)
    }
  },

  goForward: () => {
    const { navigationHistory, navigationIndex } = get()
    if (navigationIndex < navigationHistory.length - 1) {
      const next = navigationHistory[navigationIndex + 1]
      set({ selectedNoteId: next.selectedNoteId, navigationIndex: navigationIndex + 1 })
      if (next.selectedNoteId) get().expandAncestors(next.selectedNoteId)
    }
  }
}))
