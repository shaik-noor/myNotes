import { ChevronDown, ChevronUp } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ScrollableListProps {
  children: React.ReactNode
  className?: string
  scrollClassName?: string
  upLabel?: string
  downLabel?: string
}

export const ScrollableList: React.FC<ScrollableListProps> = ({
  children,
  className = 'min-h-0 flex-1',
  scrollClassName = '',
  upLabel = 'Newer',
  downLabel = 'Older'
}) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const updateAffordances = useCallback((): void => {
    const el = listRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setCanScrollUp(scrollTop > 4)
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4)
  }, [])

  const scrollBy = useCallback((dir: 'up' | 'down'): void => {
    const el = listRef.current
    if (!el) return
    el.scrollBy({ top: dir === 'up' ? -el.clientHeight * 0.8 : el.clientHeight * 0.8 })
  }, [])

  useEffect(() => {
    updateAffordances()
    const el = listRef.current
    if (!el) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateAffordances) : null
    ro?.observe(el)
    if (ro && el.firstElementChild) ro.observe(el.firstElementChild)
    const mo =
      typeof MutationObserver !== 'undefined' ? new MutationObserver(updateAffordances) : null
    mo?.observe(el, { childList: true, subtree: true })
    return () => {
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [updateAffordances])

  return (
    <div className={`relative ${className}`}>
      {canScrollUp && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-9 bg-gradient-to-b from-sidebar to-transparent"
        />
      )}
      {canScrollUp && (
        <button
          type="button"
          onClick={() => scrollBy('up')}
          className="absolute left-1/2 top-1 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-popover/95 px-2.5 py-1 text-2xs font-medium text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground cursor-pointer animate-in fade-in slide-in-from-top-1 duration-150"
          title="Scroll up"
        >
          <ChevronUp className="size-3" />
          <span>{upLabel}</span>
        </button>
      )}
      <div
        ref={listRef}
        onScroll={updateAffordances}
        className={`h-full overflow-y-auto no-scrollbar ${scrollClassName}`}
      >
        {children}
      </div>
      {canScrollDown && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-9 bg-gradient-to-t from-sidebar to-transparent"
        />
      )}
      {canScrollDown && (
        <button
          type="button"
          onClick={() => scrollBy('down')}
          className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-popover/95 px-2.5 py-1 text-2xs font-medium text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground cursor-pointer animate-in fade-in slide-in-from-bottom-1 duration-150"
          title="Scroll down"
        >
          <ChevronDown className="size-3" />
          <span>{downLabel}</span>
        </button>
      )}
    </div>
  )
}

