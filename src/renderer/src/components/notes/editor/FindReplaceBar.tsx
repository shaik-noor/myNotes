import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { CaseSensitive, ChevronDown, ChevronUp, Replace, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { duration, ease, prefersReducedMotion } from '../../ui/motion'
import { getSearchState, OPEN_FIND_REPLACE_EVENT } from './searchHighlight'

interface FindReplaceBarProps {
  editor: Editor | null
}

/**
 * In-note find & replace bar.
 */
export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({ editor }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [counts, setCounts] = useState<{ total: number; active: number }>({ total: 0, active: -1 })
  const inputRef = useRef<HTMLInputElement>(null)
  const reduced = prefersReducedMotion()

  const syncCounts = useCallback((): void => {
    if (!editor) return
    const s = getSearchState(editor)
    setCounts({ total: s.total, active: s.active })
  }, [editor])

  const runQuery = useCallback(
    (q: string, cs: boolean): void => {
      if (!editor) return
      editor.commands.setSearchQuery(q, cs)
      if (q) editor.commands.goToMatch(0)
      syncCounts()
    },
    [editor, syncCounts]
  )

  useEffect(() => {
    const onOpen = (): void => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const selected = from !== to ? editor.state.doc.textBetween(from, to) : ''
      const seed = selected && selected.length < 80 ? selected : getSearchState(editor).query

      setOpen(true)
      if (seed) {
        setQuery(seed)
        runQuery(seed, caseSensitive)
      }
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
    window.addEventListener(OPEN_FIND_REPLACE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_FIND_REPLACE_EVENT, onOpen)
  }, [editor, caseSensitive, runQuery])

  const close = useCallback((): void => {
    setOpen(false)
    editor?.commands.focus()
  }, [editor])

  const next = useCallback((): void => {
    if (!editor || counts.total === 0) return
    editor.commands.goToMatch(counts.active + 1)
    syncCounts()
  }, [editor, counts, syncCounts])

  const prev = useCallback((): void => {
    if (!editor || counts.total === 0) return
    editor.commands.goToMatch(counts.active - 1)
    syncCounts()
  }, [editor, counts, syncCounts])

  const replaceOne = useCallback((): void => {
    if (!editor || counts.total === 0) return
    const s = getSearchState(editor)
    const match = s.matches[s.active >= 0 ? s.active : 0]
    if (!match) return
    editor.chain().focus().insertContentAt({ from: match.from, to: match.to }, replaceText).run()
    const after = getSearchState(editor)
    if (after.total > 0) editor.commands.goToMatch(Math.min(s.active, after.total - 1))
    syncCounts()
  }, [editor, counts, replaceText, syncCounts])

  const replaceAll = useCallback((): void => {
    if (!editor) return
    const s = getSearchState(editor)
    if (s.matches.length === 0) return
    const chain = editor.chain().focus()
    for (let i = s.matches.length - 1; i >= 0; i--) {
      const m = s.matches[i]
      chain.insertContentAt({ from: m.from, to: m.to }, replaceText)
    }
    chain.run()
    syncCounts()
  }, [editor, replaceText, syncCounts])

  if (!editor) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -8 }}
          transition={{ duration: reduced ? 0 : duration.fast, ease: ease.out }}
          className="absolute right-4 top-3 z-40 flex flex-col gap-1.5 rounded-lg border border-border/60 bg-popover p-2 shadow-lg ring-1 ring-foreground/5"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowReplace((v) => !v)}
              title={showReplace ? 'Hide replace' : 'Show replace'}
              aria-label={showReplace ? 'Hide replace' : 'Show replace'}
              className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer ${
                showReplace ? 'bg-notes/10 text-notes' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Replace className="size-3.5" />
            </button>
            <div className="relative">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  runQuery(e.target.value, caseSensitive)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.shiftKey ? prev() : next()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    close()
                  }
                }}
                placeholder="Find"
                className="h-7 w-44 rounded-md border border-border/60 bg-background pl-2 pr-14 text-xs outline-none focus:border-notes"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-2xs tabular-nums text-muted-foreground/70 select-none">
                {counts.total > 0 ? `${counts.active + 1}/${counts.total}` : query ? '0/0' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextCs = !caseSensitive
                setCaseSensitive(nextCs)
                runQuery(query, nextCs)
              }}
              title="Match case"
              aria-label="Match case"
              className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer ${
                caseSensitive ? 'bg-notes/10 text-notes' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <CaseSensitive className="size-4" />
            </button>
            <button
              type="button"
              onClick={prev}
              disabled={counts.total === 0}
              title="Previous match (Shift+Enter)"
              aria-label="Previous match"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={counts.total === 0}
              title="Next match (Enter)"
              aria-label="Next match"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <ChevronDown className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={close}
              title="Close (Esc)"
              aria-label="Close"
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {showReplace && (
            <div className="flex items-center gap-1.5 pl-[30px]">
              <input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    replaceOne()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    close()
                  }
                }}
                placeholder="Replace with"
                className="h-7 w-44 rounded-md border border-border/60 bg-background px-2 text-xs outline-none focus:border-notes"
              />
              <button
                type="button"
                onClick={replaceOne}
                disabled={counts.total === 0}
                className="h-7 rounded-md border border-border/60 px-2 text-2xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={replaceAll}
                disabled={counts.total === 0}
                className="h-7 rounded-md border border-border/60 px-2 text-2xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                All
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
