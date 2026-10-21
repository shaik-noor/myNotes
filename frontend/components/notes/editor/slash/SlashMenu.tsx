import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import type { SlashCommandItem } from './slashItems'

export interface SlashMenuProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

/** Imperative handle the suggestion plugin uses to forward keyboard events. */
export interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

/**
 * The keyboard-navigable command list rendered inside the slash `/` popup.
 */
export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref
) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset keyboard selection when the command results change.
  useEffect(() => setSelectedIndex(0), [items])

  useLayoutEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const select = (index: number): void => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) return false
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        select(selectedIndex)
        return true
      }
      return false
    }
  }))

  if (items.length === 0) {
    return (
      <div className="editor-tool-surface z-50 relative w-64 max-w-[calc(100vw-2rem)] rounded-lg bg-popover p-3 text-2xs text-muted-foreground shadow-2xl ring-1 ring-foreground/10 border border-border/80 backdrop-blur-2xl">
        No matching blocks
      </div>
    )
  }

  let flatIndex = -1
  const groups: SlashCommandItem['group'][] = ['Basic', 'Lists', 'Insert']

  return (
    <div
      ref={containerRef}
      className="editor-tool-surface z-50 relative max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg bg-popover p-1.5 text-popover-foreground shadow-2xl ring-1 ring-foreground/10 border border-border/80 backdrop-blur-2xl"
    >
      {groups.map((group) => {
        const groupItems = items.filter((i) => i.group === group)
        if (groupItems.length === 0) return null
        return (
          <div key={group} className="mb-1 last:mb-0">
            <div className="px-2 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group}
            </div>
            {groupItems.map((item) => {
              flatIndex += 1
              const index = flatIndex
              const Icon = item.icon
              const isActive = index === selectedIndex
              return (
                <button
                  type="button"
                  key={item.title}
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => select(index)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent/60'
                  }`}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50 text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium">{item.title}</span>
                    <span className="truncate text-2xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
})
