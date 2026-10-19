# myNotes (Tauri 2.0 Edition)

A high-performance, modern desktop knowledge workspace and note-taking application powered by **Tauri 2.0**, **Rust**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and embedded **SQLite**.

`myNotes` delivers the rich Notion/Obsidian-style note-taking workspace with the lightning-fast performance, near-instant startup, and minimal memory footprint of Tauri 2.0.

---

## Performance & Architecture Highlights: Tauri 2.0 vs Electron

| Metric / Aspect | Previous Electron Architecture | **New Tauri 2.0 Architecture** |
| :--- | :--- | :--- |
| **RAM Footprint** | ~180MB – 350MB idle | **~35MB – 50MB idle** (~80% reduction) |
| **Cold Startup Time** | 1.8s – 3.2s (V8 + Chromium init) | **< 300ms** (Native Rust + OS WebKit) |
| **Installer / App Size** | ~150MB+ bundle | **~15MB – 40MB standalone binary** |
| **Database Engine** | Node-API `better-sqlite3` native addon | **Native Rust `rusqlite` with WAL mode & foreign keys** |
| **I/O & File Attachments** | Node JS Streams & Buffer serialization | **Zero-overhead native Rust file streams** |
| **Security Architecture** | Node IPC & broad renderer access | **Granular Tauri 2 capability & permission scopes** |

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
  - In-app reveal in Finder/Explorer, open with system default, and save-as dialogs.
- **Bi-directional Backlinks**:
  - Automatic note link reconciliation (`mynotes:<id>` and `mydesk-note:<id>`).
  - Responsive backlinks panel showing all pages referencing the active note.
- **Side Peek Modal**:
  - Read-only slide-out panel to preview linked pages without losing editor context.
- **Google Drive Cloud Sync (Zero-Server Privacy)**:
  - Connect with personal Google account using RFC 8252 PKCE loopback authentication server in Rust.
  - Stores all documents and attachments inside the private Google Drive **Application Data folder** (`mynotes_vault.json`).
  - High-privacy scope: app cannot access, read, or modify any other files in the user's Google Drive.
  - Local-first architecture: edits are instant on local SQLite and auto-sync in the background.
- **Import & Backup**:
  - Import Markdown, TXT, HTML, and OneNote files.
  - Full SQLite database backup and restore to JSON archives.
- **Appearance & Themes**:
  - Light, Dark, and System theme synchronization.
  - 5 color palettes (Ocean Blue, Warm Amber, Deep Violet, Emerald Forest, Soft Rose).
  - 3 editor typography choices (Inter Sans, Lora Serif, JetBrains Mono).

---

## Development

```bash
# Install frontend dependencies
npm install

# Run type check
npm run typecheck

# Run unit tests
npm test

# Start Tauri 2 development desktop app (spawns Vite + compiles Rust)
npm run dev

# Build production bundle
npm run tauri:build
```

---

## Project Structure

```
myNotes/
├── src-tauri/                 # Rust Tauri 2.0 Backend
│   ├── Cargo.toml             # Rust dependencies (rusqlite, tokio, reqwest, tiny_http)
│   ├── tauri.conf.json        # Tauri 2 configuration & window settings
│   ├── capabilities/          # Tauri 2 security permissions (dialog, opener, fs)
│   └── src/
│       ├── main.rs            # Application entrypoint
│       ├── lib.rs             # Tauri Builder setup, plugins & state initialization
│       ├── types.rs           # Core domain data types & response wrappers
│       ├── db.rs              # Rusqlite SQLite database engine & queries
│       ├── fractional_index.rs# Fractional indexing key generator for tree ordering
│       ├── attachments.rs     # Staging, MIME inference & attachment storage
│       ├── cloud.rs           # Google Drive AppData vault sync & PKCE loopback OAuth
│       ├── ai.rs              # Streaming completion engine
│       ├── importer.rs        # Local file importing
│       └── commands.rs        # #[tauri::command] IPC endpoints
├── frontend/                  # React 19 + Shadcn UI Frontend
│   ├── App.tsx                # Main application layout & keyboard navigation
│   ├── main.tsx               # React root bootstrap
│   ├── tauriBridge.ts         # Tauri IPC bridge preserving window.api contract
│   ├── env.d.ts               # Global types
│   ├── components/            # Shadcn UI & Notes components (TipTap, Sidebar, Dialogs)
│   ├── store/                 # Zustand notes store
│   ├── context/               # Theme & appearance context
│   ├── services/              # Note attachments service
│   ├── types/                 # Domain types (Note, CloudSyncConfig, Result, etc.)
│   ├── assets/                # Tailwind v4 styles, fonts & cover banners
│   └── tests/                 # Vitest test suite
├── index.html                 # Standard Vite root entrypoint
├── vite.config.ts             # Clean Vite + React 19 + Tailwind v4 config
├── tsconfig.json              # Clean standalone TypeScript configuration
└── package.json
```
