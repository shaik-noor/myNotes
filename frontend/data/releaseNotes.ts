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

export const APP_VERSION = '1.0.3'

export const RELEASE_HISTORY: ReleaseItem[] = [
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
          'Disconnecting Google Drive now also revokes access to myNotes in your Google account, not just the sign-in on this device.'
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
          'Google Drive sync no longer shows OAuth client ID, secret, or relay settings. Sign-in always goes through the secure myNotes relay, and old saved credentials are removed from your device.'
      },
      {
        category: 'fixes',
        badge: 'Reconnect',
        title: 'Clear Prompt When Access Expires',
        description:
          'If Google access is revoked or expires, myNotes now signs you out cleanly and asks you to sign in again instead of failing every sync.'
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
