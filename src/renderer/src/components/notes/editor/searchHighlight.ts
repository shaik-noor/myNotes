import type { Editor } from '@tiptap/core'
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

/** Fired to open the in-note find bar (Ctrl/Cmd-F or the header Search button, both
 * dispatched from NotesView); FindReplaceBar listens and opens. */
export const OPEN_FIND_REPLACE_EVENT = 'notes:open-find-replace'

interface SearchMatch {
  from: number
  to: number
}

interface SearchState {
  query: string
  caseSensitive: boolean
  matches: SearchMatch[]
  /** Index into `matches` of the currently-focused match (-1 when none). */
  active: number
}

const EMPTY: SearchState = { query: '', caseSensitive: false, matches: [], active: -1 }

type SearchMeta =
  | { type: 'setQuery'; query: string; caseSensitive: boolean }
  | { type: 'setActive'; active: number }
  | { type: 'clear' }

const searchPluginKey = new PluginKey<SearchState>('searchHighlight')

/** Escape a user string so it's matched literally inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Scan the doc's text blocks for all (non-overlapping) matches of `query`. */
function computeMatches(doc: import('@tiptap/pm/model').Node, state: SearchState): SearchMatch[] {
  const { query, caseSensitive } = state
  if (!query) return []
  const matches: SearchMatch[] = []
  let re: RegExp
  try {
    re = new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi')
  } catch {
    return []
  }
  // Search per text node so positions map to real doc offsets.
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text
    re.lastIndex = 0
    let m = re.exec(text)
    while (m !== null) {
      matches.push({ from: pos + m.index, to: pos + m.index + m[0].length })
      if (m.index === re.lastIndex) re.lastIndex++ // guard against zero-length
      m = re.exec(text)
    }
    return true
  })
  return matches
}

/**
 * Find the nearest ancestor of `el` that actually scrolls vertically — i.e. its
 * `overflow-y` is `auto`/`scroll`/`overlay` AND its content is taller than its box.
 * This is the notes writing canvas; the surrounding app chrome uses `overflow:hidden`
 * (which we deliberately skip) so we never treat it as the scroll target.
 */
function getScrollParentY(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const oy = getComputedStyle(node).overflowY
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node
    }
    node = node.parentElement
  }
  return null
}

/**
 * Scroll the active match into view.
 */
function scrollMatchIntoView(view: EditorView, from: number): void {
  requestAnimationFrame(() => {
    try {
      const active = view.dom.querySelector<HTMLElement>('.mydesk-search-match.is-active, .mynotes-search-match.is-active')
      const el =
        active ??
        (() => {
          const { node } = view.domAtPos(from)
          return node.nodeType === 1 ? (node as HTMLElement) : node.parentElement
        })()
      if (!el) return
      const scroller = getScrollParentY(el)
      if (!scroller) {
        // No dedicated scroll container found — best-effort native fallback.
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }
      const cRect = scroller.getBoundingClientRect()
      const eRect = el.getBoundingClientRect()
      // Keep the match clear of the sticky document header, but centre it when the
      // viewport is tall enough. `HEADER_CLEARANCE` > the 44px header height.
      const HEADER_CLEARANCE = 96
      const desiredTopOffset = Math.max(
        HEADER_CLEARANCE,
        (scroller.clientHeight - eRect.height) / 2
      )
      const targetTop = scroller.scrollTop + (eRect.top - cRect.top) - desiredTopOffset
      const maxTop = scroller.scrollHeight - scroller.clientHeight
      scroller.scrollTo({ top: Math.max(0, Math.min(targetTop, maxTop)), behavior: 'smooth' })
    } catch {
      /* position went stale between dispatch and frame — ignore */
    }
  })
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchQuery: (query: string, caseSensitive: boolean) => ReturnType
      goToMatch: (index: number) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

/**
 * In-note find & (optional) replace, implemented as ProseMirror decorations so it
 * never mutates the doc while searching.
 */
export const SearchHighlight = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchPluginKey,
        state: {
          init(): SearchState {
            return EMPTY
          },
          apply(tr, value): SearchState {
            let next = value
            const meta = tr.getMeta(searchPluginKey) as SearchMeta | undefined
            if (meta) {
              if (meta.type === 'clear') return EMPTY
              if (meta.type === 'setQuery') {
                const base: SearchState = {
                  ...value,
                  query: meta.query,
                  caseSensitive: meta.caseSensitive
                }
                const matches = computeMatches(tr.doc, base)
                return { ...base, matches, active: matches.length > 0 ? 0 : -1 }
              }
              if (meta.type === 'setActive') {
                return { ...value, active: meta.active }
              }
            }
            // On a doc change with an active query, recompute so highlights track edits.
            if (tr.docChanged && next.query) {
              const matches = computeMatches(tr.doc, next)
              const active = matches.length === 0 ? -1 : Math.min(next.active, matches.length - 1)
              next = { ...next, matches, active }
            }
            return next
          }
        },
        props: {
          decorations(state) {
            const s = searchPluginKey.getState(state)
            if (!s || s.matches.length === 0) return DecorationSet.empty
            const decos = s.matches.map((m, i) =>
              Decoration.inline(m.from, m.to, {
                class: i === s.active ? 'mydesk-search-match is-active' : 'mydesk-search-match'
              })
            )
            return DecorationSet.create(state.doc, decos)
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      setSearchQuery:
        (query: string, caseSensitive: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setQuery', query, caseSensitive })
            dispatch(tr)
          }
          return true
        },
      goToMatch:
        (index: number) =>
        ({ tr, dispatch, state, view }) => {
          const s = searchPluginKey.getState(state)
          if (!s || s.matches.length === 0) return false
          const wrapped = ((index % s.matches.length) + s.matches.length) % s.matches.length
          const match = s.matches[wrapped]
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setActive', active: wrapped })
            tr.setSelection(TextSelection.create(tr.doc, match.from, match.to))
            dispatch(tr)
            scrollMatchIntoView(view, match.from)
          }
          return true
        },
      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'clear' })
            dispatch(tr)
          }
          return true
        }
    }
  }
})

/** Read the current search state (query + matches + active index) from the editor. */
export function getSearchState(editor: Editor): {
  total: number
  active: number
  matches: SearchMatch[]
  query: string
  caseSensitive: boolean
} {
  const s = searchPluginKey.getState(editor.state)
  if (!s) return { total: 0, active: -1, matches: [], query: '', caseSensitive: false }
  return {
    total: s.matches.length,
    active: s.active,
    matches: s.matches,
    query: s.query,
    caseSensitive: s.caseSensitive
  }
}

