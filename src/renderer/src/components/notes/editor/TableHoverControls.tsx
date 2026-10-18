import type { Editor } from '@tiptap/react'
import { Check, Copy, Plus, SquareDashedMousePointer } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { toast } from '../../ui/toast'
import { cn } from '../../ui/utils'
import {
  addColumnAtEnd,
  addRowAtEnd,
  copyTable,
  selectTable,
  tablePosFromDom
} from './tableActions'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const HIDE_DELAY_MS = 250

function sameBox(a: Box | null, b: Box | null): boolean {
  return (
    !!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  )
}

export const TableHoverControls: React.FC<{
  editor: Editor
  containerRef: React.RefObject<HTMLDivElement | null>
}> = ({ editor, containerRef }) => {
  const [box, setBox] = useState<Box | null>(null)
  const [copied, setCopied] = useState(false)
  const wrapperRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let frame = 0

    const measure = (): void => {
      frame = 0
      const wrapper = wrapperRef.current
      if (!wrapper?.isConnected) {
        wrapperRef.current = null
        setBox(null)
        return
      }
      const c = root.getBoundingClientRect()
      const w = wrapper.getBoundingClientRect()
      const tableRight = wrapper.querySelector('table')?.getBoundingClientRect().right ?? w.right
      const next: Box = {
        top: w.top - c.top,
        left: w.left - c.left,
        width: Math.min(tableRight, w.right) - w.left,
        height: w.height
      }
      setBox((prev) => (sameBox(prev, next) ? prev : next))
    }
    const scheduleMeasure = (): void => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const resizeObserver = new ResizeObserver(scheduleMeasure)

    const track = (wrapper: HTMLElement | null): void => {
      if (wrapper !== wrapperRef.current) {
        resizeObserver.disconnect()
        wrapperRef.current = wrapper
        if (wrapper) {
          resizeObserver.observe(wrapper)
          const table = wrapper.querySelector('table')
          if (table) resizeObserver.observe(table)
        }
      }
      scheduleMeasure()
    }

    const onMove = (e: MouseEvent): void => {
      const target = e.target as Element | null
      if (target?.closest('[data-table-controls]')) {
        clearTimeout(hideTimer)
        return
      }
      const wrapper = target?.closest<HTMLElement>('.tableWrapper')
      if (wrapper && editor.view.dom.contains(wrapper)) {
        clearTimeout(hideTimer)
        track(wrapper)
        return
      }
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => track(null), HIDE_DELAY_MS)
    }
    const onLeave = (): void => {
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => track(null), HIDE_DELAY_MS)
    }

    root.addEventListener('mousemove', onMove)
    root.addEventListener('mouseleave', onLeave)
    return () => {
      root.removeEventListener('mousemove', onMove)
      root.removeEventListener('mouseleave', onLeave)
      resizeObserver.disconnect()
      clearTimeout(hideTimer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [editor, containerRef])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  if (!box) return null

  const tablePos = (): number | null =>
    wrapperRef.current ? tablePosFromDom(editor, wrapperRef.current) : null

  const handleCopy = async (): Promise<void> => {
    const pos = tablePos()
    if (pos === null) return
    try {
      if (await copyTable(editor, pos)) setCopied(true)
    } catch (e) {
      toast.error('Could not copy table', {
        description: e instanceof Error ? e.message : String(e)
      })
    }
  }

  const keepFocus = (e: React.MouseEvent): void => e.preventDefault()
  const addBar =
    'absolute z-20 flex cursor-pointer items-center justify-center rounded-sm bg-muted/50 text-muted-foreground/60 transition-colors hover:bg-notes/15 hover:text-notes'

  return (
    <>
      <div
        data-table-controls
        className="absolute z-30 flex items-center gap-0.5 rounded-md border border-border/70 bg-popover p-0.5 shadow-sm"
        style={{
          top: box.top,
          left: box.left + box.width,
          transform: 'translate(-100%, calc(-100% - 4px))'
        }}
      >
        <ToolbarButton
          label="Select table"
          onMouseDown={keepFocus}
          onClick={() => {
            const pos = tablePos()
            if (pos !== null) selectTable(editor, pos)
          }}
        >
          <SquareDashedMousePointer className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label={copied ? 'Copied' : 'Copy table'}
          onMouseDown={keepFocus}
          onClick={() => void handleCopy()}
          active={copied}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </ToolbarButton>
      </div>

      <button
        type="button"
        data-table-controls
        aria-label="Add row"
        title="Add row"
        onMouseDown={keepFocus}
        onClick={() => {
          const pos = tablePos()
          if (pos !== null) addRowAtEnd(editor, pos)
        }}
        className={cn(addBar, 'h-4')}
        style={{ top: box.top + box.height + 2, left: box.left, width: box.width }}
      >
        <Plus className="size-3" />
      </button>
      <button
        type="button"
        data-table-controls
        aria-label="Add column"
        title="Add column"
        onMouseDown={keepFocus}
        onClick={() => {
          const pos = tablePos()
          if (pos !== null) addColumnAtEnd(editor, pos)
        }}
        className={cn(addBar, 'w-4')}
        style={{ top: box.top, left: box.left + box.width + 2, height: box.height }}
      >
        <Plus className="size-3" />
      </button>
    </>
  )
}

function ToolbarButton({
  label,
  active,
  onClick,
  onMouseDown,
  children
}: {
  label: string
  active?: boolean
  onClick: () => void
  onMouseDown: (e: React.MouseEvent) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          onMouseDown={onMouseDown}
          className={cn(
            'flex size-6 cursor-pointer items-center justify-center rounded-sm transition-colors',
            active
              ? 'text-notes'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
