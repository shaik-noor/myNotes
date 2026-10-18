import { GripVertical } from 'lucide-react'
import type React from 'react'

export const PanelResizeHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void
  isDragging: boolean
}> = ({ onMouseDown, isDragging }) => (
  <div
    onMouseDown={onMouseDown}
    className="group absolute left-0 top-0 z-20 h-full w-4 -translate-x-1/2 cursor-col-resize"
    title="Drag to resize"
  >
    <div className="relative flex h-full items-center justify-center">
      <div
        className={`absolute h-full w-px transition-colors ${
          isDragging ? 'bg-notes' : 'bg-border/30 group-hover:bg-notes/60'
        }`}
      />
      <GripVertical
        className={`relative size-4 transition-all ${
          isDragging
            ? 'text-notes opacity-100'
            : 'text-muted-foreground/40 opacity-60 group-hover:opacity-100 group-hover:text-notes/80'
        }`}
      />
    </div>
  </div>
)
