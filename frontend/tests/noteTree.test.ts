import { describe, expect, it } from 'vitest'
import {
  buildNoteTree,
  getAncestors,
  getDescendantIds,
  type Note
} from '../store/useNotesStore'

describe('Note Hierarchy & Tree Structure', () => {
  const sampleNotes: Note[] = [
    {
      id: 'root-1',
      title: 'Root Notebook',
      content: 'Root content',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      parentId: null,
      sortKey: 'a0'
    },
    {
      id: 'child-1',
      title: 'Child Page 1',
      content: 'Child 1 content',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      parentId: 'root-1',
      sortKey: 'a0'
    },
    {
      id: 'grandchild-1',
      title: 'Grandchild Subpage',
      content: 'Deeply nested',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      parentId: 'child-1',
      sortKey: 'a0'
    },
    {
      id: 'root-2',
      title: 'Pinned Root',
      content: 'Pinned note',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      pinned: true,
      parentId: null,
      sortKey: 'z9'
    }
  ]

  it('builds nested tree correctly with proper depth', () => {
    const tree = buildNoteTree(sampleNotes)

    // Root-2 is pinned, so it should be first despite sortKey
    expect(tree[0].id).toBe('root-2')
    expect(tree[0].depth).toBe(0)

    // Root-1 is second
    expect(tree[1].id).toBe('root-1')
    expect(tree[1].depth).toBe(0)
    expect(tree[1].children.length).toBe(1)

    // Child-1
    const child = tree[1].children[0]
    expect(child.id).toBe('child-1')
    expect(child.depth).toBe(1)
    expect(child.children.length).toBe(1)

    // Grandchild-1
    const grandchild = child.children[0]
    expect(grandchild.id).toBe('grandchild-1')
    expect(grandchild.depth).toBe(2)
  })

  it('resolves ancestors path accurately', () => {
    const ancestors = getAncestors(sampleNotes, 'grandchild-1')
    expect(ancestors.map((a) => a.id)).toEqual(['root-1', 'child-1'])
  })

  it('handles circular references gracefully in getAncestors', () => {
    const circularNotes: Note[] = [
      {
        id: 'circ-1',
        title: 'Circ 1',
        content: '',
        createdAt: '',
        updatedAt: '',
        parentId: 'circ-2'
      },
      {
        id: 'circ-2',
        title: 'Circ 2',
        content: '',
        createdAt: '',
        updatedAt: '',
        parentId: 'circ-1'
      }
    ]
    expect(() => getAncestors(circularNotes, 'circ-1')).not.toThrow()
  })

  it('finds all descendant IDs recursively', () => {
    const descendants = getDescendantIds(sampleNotes, 'root-1')
    expect(descendants).toContain('child-1')
    expect(descendants).toContain('grandchild-1')
    expect(descendants.length).toBe(2)
  })
})
