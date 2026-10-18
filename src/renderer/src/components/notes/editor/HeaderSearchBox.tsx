import { type Editor, useEditorState } from '@tiptap/react'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSearchState } from './searchHighlight'

interface HeaderSearchBoxProps {
  editor: Editor | null
}

const EMPTY = { total: 0, active: -1, query: '', caseSensitive: false }

/**
 * Always-visible "Search this page" box in the document header.
 */
export const HeaderSearchBox: React.FC<HeaderSearchBoxProps> = ({ editor }) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const state =
    useEditorState({
      editor,
      selector: ({ editor }) => {
        if (!editor) return EMPTY
        const s = getSearchState(editor)
        return { total: s.total, active: s.active, query: s.query, caseSensitive: s.caseSensitive }
      }
    }) ?? EMPTY

  useEffect(() => {
    if (document.activeElement !== inputRef.current && state.query !== query) {
      setQuery(state.query)
    }
  }, [state.query])

  const run = useCallback(
    (q: string): void => {
      if (!editor) return
      editor.commands.setSearchQuery(q, state.caseSensitive)
      if (q) editor.commands.goToMatch(0)
    },
    [editor, state.caseSensitive]
  )

  const next = useCallback((): void => {
    if (!editor || state.total === 0) return
    editor.commands.goToMatch(state.active + 1)
  }, [editor, state.total, state.active])

  const prev = useCallback((): void => {
    if (!editor || state.total === 0) return
    editor.commands.goToMatch(state.active - 1)
  }, [editor, state.total, state.active])

  const clear = useCallback((): void => {
    setQuery('')
    editor?.commands.clearSearch()
    inputRef.current?.focus()
  }, [editor])

  const hasQuery = query.length > 0

  return (
    <div
      className={`flex h-7 items-center gap-1 rounded-lg border bg-background/60 pl-2 pr-1 transition-colors ${
        hasQuery ? 'border-notes/50' : 'border-border/60'
      }`}
    >
      <Search className="size-3.5 shrink-0 text-muted-foreground/70" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          run(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.shiftKey ? prev() : next()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            clear()
          }
        }}
        placeholder="Search this page…"
        aria-label="Search this page"
        className="h-full w-32 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 sm:w-44"
      />
      {hasQuery && (
        <>
          <span className="select-none px-0.5 text-2xs tabular-nums text-muted-foreground/70">
            {state.total > 0 ? `${state.active + 1}/${state.total}` : '0/0'}
          </span>
          <button
            type="button"
            onClick={prev}
            disabled={state.total === 0}
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={state.total === 0}
            title="Next match (Enter)"
            aria-label="Next match"
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={clear}
            title="Clear search (Esc)"
            aria-label="Clear search"
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

