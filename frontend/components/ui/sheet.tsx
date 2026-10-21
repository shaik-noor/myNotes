import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from './utils'

export const Sheet = DialogPrimitive.Root

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'left' | 'right' }
>(({ side = 'right', className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="sheet-overlay fixed inset-0 z-50 bg-black/35" />
    <DialogPrimitive.Content
      ref={ref}
      data-side={side}
      data-slot="sheet"
      className={cn(
        'sheet-panel fixed inset-y-0 z-50 flex h-dvh w-full max-w-md flex-col gap-4 overflow-y-auto bg-background p-5 text-foreground shadow-xl outline-none',
        side === 'left' ? 'left-0 border-r border-border' : 'right-0 border-l border-border',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notes/40">
        <X className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = 'SheetContent'
