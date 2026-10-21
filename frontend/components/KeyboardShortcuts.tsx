import type React from 'react'

const SHORTCUT_GROUPS = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Mod', 'H'], description: 'Go to Home' },
      { keys: ['Mod', 'N'], description: 'Create new page' },
      { keys: ['Mod', 'Shift', 'N'], description: 'Create a notebook' },
      { keys: ['Mod', 'S'], description: 'Save current note' },
      { keys: ['Mod', 'F'], description: 'Find and replace' },
      { keys: ['Mod', ','], description: 'Open Settings' },
      { keys: ['Esc'], description: 'Close a dialog' }
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
    category: 'Editor commands',
    items: [
      { keys: ['/'], description: 'Insert a block' },
      { keys: ['@'], description: 'Link to a page' },
      { keys: ['Tab'], description: 'Indent list or next table cell' },
      { keys: ['Shift', 'Tab'], description: 'Outdent list or previous table cell' }
    ]
  }
]

export const KeyboardShortcutsContent: React.FC = () => {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  return (
    <div className="space-y-6">
      {SHORTCUT_GROUPS.map((group) => (
        <section key={group.category}>
          <h3 className="mb-3 text-sm font-medium">{group.category}</h3>
          <div className="divide-y divide-border rounded-lg border border-border">
            {group.items.map((item) => (
              <div
                key={item.description}
                className="flex items-center justify-between gap-4 px-3 py-3"
              >
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
                <span className="flex shrink-0 gap-1">
                  {item.keys.map((key) => (
                    <kbd
                      key={key}
                      className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs"
                    >
                      {key === 'Mod' ? (isMac ? '⌘' : 'Ctrl') : key}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
