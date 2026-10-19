export interface ReleaseItem {
  version: string
  date: string
  title: string
  highlights: {
    category: 'performance' | 'features' | 'cloud' | 'ui' | 'fixes'
    badge: string
    title: string
    description: string
  }[]
}

export const APP_VERSION = '1.0.0'

export const RELEASE_HISTORY: ReleaseItem[] = [
  {
    version: '1.0.0',
    date: 'October 2026',
    title: 'Tauri 2.0 Native Engine & Cloud Sync Upgrade',
    highlights: [
      {
        category: 'performance',
        badge: 'Tauri 2.0 + Rust',
        title: '80% Lower Memory & Instant Launch',
        description:
          'Migrated from Electron to Tauri 2.0 with native Rust backend and WebKit. Cold boot is instant and RAM usage drops from ~350MB to <70MB.'
      },
      {
        category: 'performance',
        badge: 'SQLite WAL',
        title: 'Native Rusqlite & Write-Ahead Logging',
        description:
          'Offline-first zero latency storage with relational integrity, foreign key cascades, and atomic write-ahead log operations.'
      },
      {
        category: 'cloud',
        badge: 'Google Drive BYOC',
        title: 'Private Cloud Vault Sync',
        description:
          'Synchronize notes across devices via private Google Drive AppData folder using secure OAuth 2.0 PKCE loopback authentication.'
      },
      {
        category: 'ui',
        badge: 'Visual Identity',
        title: 'Fresh myDesk-Inspired Squircle Branding',
        description:
          'Gorgeous radiant blue squircle with macOS rim lighting, luminous cloud motif, and glowing open notebook icon.'
      },
      {
        category: 'features',
        badge: 'Rich-Text Editor',
        title: 'TipTap v3 & Full Markdown',
        description:
          'Slash commands (/), page mentions (@), code blocks with syntax highlighting, nested notebooks, and inline attachments up to 25MB.'
      }
    ]
  }
]
