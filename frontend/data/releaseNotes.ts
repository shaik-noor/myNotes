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

export const APP_VERSION = '1.2.3'

export const RELEASE_HISTORY: ReleaseItem[] = [
  {
    version: '1.2.3',
    date: 'October 2026',
    title: 'Build From Source',
    highlights: [
      {
        category: 'fixes',
        badge: 'Distribution',
        title: 'Build Locally on Mac or Windows',
        description:
          'MyNotes is distributed as source code. Public Mac and Windows installers have been withdrawn; use the website or README instructions to build the app on your own computer.'
      },
      {
        category: 'fixes',
        badge: 'Releases',
        title: 'Verified Packages & Download Checksums',
        description:
          'MacBook releases run local validation and native tests, verify macOS package integrity, include SHA-256 checksums, and support Developer ID signing and notarization when credentials are configured.'
      }
    ]
  },
  {
    version: '1.2.0',
    date: 'October 2026',
    title: 'Brand Refresh & Native macOS Experience',
    highlights: [
      {
        category: 'ui',
        badge: 'New Brand',
        title: 'New Logo & MyNotes Identity',
        description:
          'Updated brand identity featuring folded ivory notebook pages on midnight blue, unified across native icons, dock, title bar, and dialogs.'
      },
      {
        category: 'ui',
        badge: 'macOS Native',
        title: 'Seamless Window Styling & Safe Insets',
        description:
          'Eliminated inner frame highlights on dark theme, transparent traffic-light titlebar integration, and unified safe-area insets below the 48px header for all sheets.'
      },
      {
        category: 'ui',
        badge: 'Accessibility',
        title: 'Focused Panels & Keyboard Trapping',
        description:
          'Dialogs and drawers now feature focused keyboard containment, boundary-constrained focus outlines, and automatic navigation drawer dismissal when opening settings.'
      }
    ]
  },
  {
    version: '1.1.0',
    date: 'October 2026',
    title: 'Interface Redesign & Stability Update',
    highlights: [
      {
        category: 'ui',
        badge: 'Redesign',
        title: 'Page-First Library & Slide-Over Panels',
        description:
          'A cleaner, focused library puts your notes first. Drawers for Quick Notes, Templates, Outline, and unified Settings slide out smoothly from screen edges with full keyboard and responsive support.'
      },
      {
        category: 'performance',
        badge: 'Fast Launch',
        title: '66% Smaller Initial Bundle & Workspace Skeleton',
        description:
          'Lazy-loaded editor modules drop initial entry bundle from ~1.8MB to ~600KB, paired with instant workspace skeleton loading.'
      },
      {
        category: 'fixes',
        badge: 'Data Integrity',
        title: 'Atomic Database Transactions & Rollback Protection',
        description:
          'Single-transaction atomic execution for backups, restores, and Drive merges. If an attachment or note fails, all changes roll back safely to prevent partial data corruption.'
      },
      {
        category: 'features',
        badge: 'Editor',
        title: 'Inline Code Tools & Markdown Table Boundaries',
        description:
          'In-block code language picker with one-click copy, persistent inline find-and-replace with match counts, and Markdown serialization fixes for tables and lists.'
      },
      {
        category: 'ui',
        badge: 'macOS Native',
        title: 'Frameless macOS Window & Theme Refinements',
        description:
          'Transparent titlebar with native traffic light positioning, seamless background styling, 5 high-contrast accent palettes, and respect for system reduced motion.'
      }
    ]
  },
  {
    version: '1.0.3',
    date: 'October 2026',
    title: 'Disconnect Revokes Google Access',
    highlights: [
      {
        category: 'cloud',
        badge: 'Privacy',
        title: 'Disconnect Now Revokes Access at Google',
        description:
          'Disconnecting Google Drive now also revokes access to MyNotes in your Google account, not just the sign-in on this device.'
      }
    ]
  },
  {
    version: '1.0.2',
    date: 'October 2026',
    title: 'Simpler Google Drive Sign-In',
    highlights: [
      {
        category: 'cloud',
        badge: 'Zero Setup',
        title: 'Just Sign In with Google',
        description:
          'Google Drive sync no longer shows OAuth client ID, secret, or relay settings. Sign-in always goes through the secure MyNotes relay, and old saved credentials are removed from your device.'
      },
      {
        category: 'fixes',
        badge: 'Reconnect',
        title: 'Clear Prompt When Access Expires',
        description:
          'If Google access is revoked or expires, MyNotes now signs you out cleanly and asks you to sign in again instead of failing every sync.'
      }
    ]
  },
  {
    version: '1.0.1',
    date: 'October 2026',
    title: 'Security & Sync Reliability Update',
    highlights: [
      {
        category: 'cloud',
        badge: 'Secure Sign-In',
        title: 'Hardened Google Drive Authentication',
        description:
          'Google tokens never pass through the browser, the auth relay holds the client secret, and refresh tokens are pinned to the server that issued them.'
      },
      {
        category: 'fixes',
        badge: 'Sync Safety',
        title: 'No More Overwrites on Failed Downloads',
        description:
          'Sync now stops instead of uploading over your cloud vault when it cannot be read, protecting edits made on other devices.'
      },
      {
        category: 'ui',
        badge: 'Locked Down',
        title: 'Strict Content Security Policy',
        description:
          'The app window now enforces a strict CSP and no longer has direct filesystem access.'
      }
    ]
  },
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
        badge: 'Google Drive 1-Click',
        title: '1-Click Private Cloud Vault Sync',
        description:
          'Synchronize notes across devices via private Google Drive AppData folder using built-in OAuth credentials (.env) and PKCE loopback authentication — connect with a single click.'
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
