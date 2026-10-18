import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import type React from 'react'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUT_GROUPS = [
  {
    category: 'General',
    items: [
      { keys: ['Mod', 'S'], description: 'Save current note' },
      { keys: ['Mod', 'F'], description: 'Find & Replace in note' },
      { keys: ['Esc'], description: 'Close modals & find bar' }
    ]
  },
  {
    category: 'Formatting',
    items: [
      { keys: ['Mod', 'B'], description: 'Toggle Bold' },
      { keys: ['Mod', 'I'], description: 'Toggle Italic' },
      { keys: ['Mod', 'U'], description: 'Toggle Underline' },
      { keys: ['Mod', 'K'], description: 'Insert or edit link' },
      { keys: ['Mod', 'Z'], description: 'Undo edit' },
      { keys: ['Mod', 'Shift', 'Z'], description: 'Redo edit' }
    ]
  },
  {
    category: 'Commands & Menus',
    items: [
      { keys: ['/'], description: 'Slash menu (insert blocks, tables, images)' },
      { keys: ['@'], description: 'Link to note (@-mention autocomplete)' },
      { keys: ['Tab'], description: 'Indent list or next table cell' },
      { keys: ['Shift', 'Tab'], description: 'Outdent list or previous table cell' }
    ]
  }
]

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:w-[540px] max-w-[94vw] sm:max-w-[540px] rounded-2xl border border-border/40 bg-background/95 backdrop-blur-2xl shadow-2xl p-6 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Speed up your note writing workflow with shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 divide-y divide-border/30 overflow-hidden">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <span className="text-foreground/90">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 text-2xs font-mono font-medium rounded border border-border/70 bg-muted/60 text-foreground shadow-3xs"
                        >
                          {k === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
