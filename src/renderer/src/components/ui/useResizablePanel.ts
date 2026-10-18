import { useCallback, useEffect, useRef, useState } from 'react'

interface ResizablePanelOptions {
  initial?: number
  min?: number
  max?: number
  storageKey?: string
  edge?: 'left' | 'right'
}

export function useResizablePanel({
  initial = 400,
  min = 320,
  max = 720,
  storageKey,
  edge = 'left'
}: ResizablePanelOptions = {}): {
  width: number
  isDragging: boolean
  onHandleMouseDown: (e: React.MouseEvent) => void
} {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      const saved = Number(localStorage.getItem(storageKey))
      if (saved && saved >= min && saved <= max) return saved
    }
    return initial
  })
  const [isDragging, setIsDragging] = useState(false)
  const frame = useRef<number | null>(null)

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      const startX = e.clientX
      const startWidth = width

      const onMove = (ev: MouseEvent): void => {
        if (frame.current !== null) return
        frame.current = requestAnimationFrame(() => {
          frame.current = null
          const delta = edge === 'left' ? startX - ev.clientX : ev.clientX - startX
          const next = Math.min(max, Math.max(min, startWidth + delta))
          setWidth(next)
        })
      }

      const onUp = (): void => {
        setIsDragging(false)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        if (frame.current !== null) {
          cancelAnimationFrame(frame.current)
          frame.current = null
        }
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width, min, max, edge]
  )

  useEffect(() => {
    if (!storageKey || isDragging) return
    localStorage.setItem(storageKey, String(width))
  }, [width, isDragging, storageKey])

  return { width, isDragging, onHandleMouseDown }
}

