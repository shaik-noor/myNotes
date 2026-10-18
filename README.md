# myNotes

A modern, standalone desktop knowledge workspace and note-taking application powered by Electron, React, TypeScript, Tailwind CSS v4, and SQLite.

`myNotes` is a complete, decoupled clone of the rich Notes workspace from `MyDesk`, packaged into its own independent, zero-dependency desktop app.

---

## Features

- **Document Hierarchy**: Full tree navigation with infinite nesting, breadcrumbs, parent/child relationships, drag-and-drop fractional indexing, and multi-selection batch actions.
- **TipTap WYSIWYG Editor**:
  - Full-featured Notion-like slash command menu (`/` menu with headings, lists, quotes, tables, code blocks, banners, subpages).
  - Page mention autocomplete (`@` menu linking to any document).
  - Floating bubble toolbar for instant styling (bold, italic, underline, strike, code, highlight, text alignment, font family, color).
  - Interactive table tools with row/column insertion, deletion, sorting, cell merging, splitting, and header toggling.
  - Multi-language syntax highlighted code blocks with language bar selector, copy, and formatting.
  - Custom banners with 50 curated high-resolution covers and note glyph picker.
  - Inline find & replace bar with match counters and navigation.
  - Document outline sidebar showing nested headings in real-time.
- **Attachments System**:
  - Local staging up to 25MB per file with SQLite storage.
  - Drag-and-drop and clipboard paste file attachment directly into notes.
  - In-app reveal, open with system default, and save-as dialogs.
- **Bi-directional Backlinks**:
  - Automatic note link reconciliation.
  - Responsive backlinks panel showing all pages referencing the active note.
- **Side Peek Modal**:
  - Read-only slide-out panel to preview linked pages without losing editor context.
- **Import & Backup**:
  - Import Markdown, TXT, HTML, and OneNote files.
  - Full SQLite database backup and restore to JSON archives.
- **Appearance & Themes**:
  - Light, Dark, and System theme synchronization.
  - 6 color palettes (Blue, Purple, Emerald, Amber, Rose, Zinc).
  - 4 editor typography choices (Sans, Serif, Mono, Geist).

---

## Development

```bash
# Install dependencies
npm install

# Rebuild native SQLite driver for Electron
npm run rebuild:native

# Type check
npm run typecheck

# Start development server
npm run dev

# Build production bundle
npm run build

# Package standalone macOS / Windows / Linux application
npm run package
```

