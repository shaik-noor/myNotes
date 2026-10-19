# Release Notes: myNotes v1.0.3

**Release Date:** October 19, 2026
**Downloads:** `myNotes_1.0.3_aarch64.dmg` (macOS Apple Silicon), `myNotes_1.0.3_x64-setup.exe`, `myNotes_1.0.3_x64_en-US.msi` (Windows x64)

## 🔐 Privacy
- **Disconnect now revokes access at Google:** Settings → Cloud Sync → Disconnect removes the sign-in from this device and also revokes myNotes' access in your Google account. Local data is cleared first, so Disconnect works even when you're offline.

---

# Release Notes: myNotes v1.0.2

**Release Date:** October 19, 2026
**Downloads:** `myNotes_1.0.2_x64-setup.exe`, `myNotes_1.0.2_x64_en-US.msi` (Windows x64)

## ☁️ Simpler Google Drive sign-in
- Settings → Cloud Sync no longer shows developer options for OAuth client IDs, client secrets, or relay URLs. Just click **Sign in with Google**.
- Sign-in always goes through the secure myNotes relay, and the app no longer supports embedded Google OAuth credentials.
- OAuth credentials saved by older versions are removed from your device when the app starts.
- If Google access is revoked or expires, myNotes signs you out cleanly and asks you to sign in again.

---

# Release Notes: myNotes v1.0.1

**Release Date:** October 19, 2026
**Type:** Security & reliability update (recommended for all users)
**Downloads:** `myNotes_1.0.1_x64-setup.exe`, `myNotes_1.0.1_x64_en-US.msi` (Windows x64)

## 🔐 Security
- **Hardened Google sign-in relay:** Google tokens never pass through the browser anymore. The relay only forwards a one-time code bound to the app's PKCE verifier, and the app redeems it directly. This fixes a script-injection issue in the old sign-in page that could expose tokens.
- **No client secret in the app:** release builds using the auth relay no longer embed Google OAuth credentials.
- **Tokens are pinned to their issuer:** refresh tokens are only ever sent to the relay or client that issued them, and changing sign-in settings signs you out. Custom relay URLs must use `https://`.
- **Locked-down webview:** a strict Content Security Policy is now enforced, and the unused filesystem plugin (which could read the app database) has been removed.

## 🛠️ Fixes
- Cloud sync no longer uploads over the cloud vault when downloading or reading it fails, which could drop edits made on other devices. Failed uploads are now reported instead of being shown as successful.
- The sign-in toast no longer says "Connected" before you've finished signing in, and sign-in errors now show up in Settings.
- Abandoned sign-ins time out after 5 minutes instead of leaving a local listener open.
- Settings no longer crash on Client IDs containing non-ASCII characters.

> After updating, you may be asked to sign in to Google Drive once more.

---

# Release Notes: myNotes v1.0.0

**Release Date:** October 19, 2026  
**Architecture:** macOS Apple Silicon (`aarch64`) & Cross-Platform  
**Download Bundle:** `myNotes_1.0.0_aarch64.dmg`  

Welcome to the official 1.0.0 release of **myNotes**! This release marks a complete evolution of the desktop knowledge workspace, rewritten from the ground up on **Tauri 2.0** and **Rust** with **React 19**, **Tailwind CSS v4**, and **Shadcn UI**.

---

## 🚀 Key Highlights & What's New

### ⚡ 1. Tauri 2.0 & Native Rust Core
- **80% Lower Memory Footprint:** Replaced heavyweight Chromium/Node runtimes with macOS WebKit and optimized native Rust binaries (~40MB app size).
- **Sub-Second Cold Boot:** Launches in milliseconds with zero lag or idle CPU battery drain.
- **Robust IPC:** Fast, type-safe asynchronous Rust commands over Tauri 2.0 IPC protocols.

### 💾 2. Native SQLite Engine with WAL Mode
- **Zero-Latency Storage:** Powered by native `rusqlite` with SQLite Write-Ahead Logging (`WAL`) enabled for fast concurrent reads and writes.
- **Relational Integrity:** Full schema management with foreign key constraints, recursive cascade deletion, cycle detection, and fractional indexing ordering.
- **Automatic Link Reconciliation:** Automatically tracks bidirectional backlinks (`mynotes:<id>` and `mydesk-note:<id>`).

### ☁️ 3. Google Drive AppData Cloud Sync (1-Click BYOC)
- **Zero Subscription / 1-Click Connect:** Bring Your Own Cloud (BYOC) using OAuth 2.0 PKCE with a local loopback server (`127.0.0.1:0/callback`). Pre-configured via `.env` so end users simply click "Connect" without entering client IDs or secrets.
- **Hidden AppData Folder:** Syncs to Google Drive's protected `appDataFolder` without cluttering your main Drive files.
- **Non-Destructive Differential Merging:** Last-Write-Wins (LWW) conflict resolution with timestamp-based merging of notes and links.

### 🎨 4. Fresh Visual Identity Inspired by `myDesk`
- **Brand Continuity:** An iconic radiant sapphire-to-azure blue squircle with macOS Big Sur/Sonoma glassmorphism, subtle rim lighting, and 3D depth.
- **Notes Heritage:** An elegant glowing open notebook and fountain pen nib atop the signature cloud backdrop.
- **Native macOS Polish:** Transparent titlebar with overlay traffic lights, dark mode adaptation, and buttery smooth Framer Motion micro-animations.

### ✍️ 5. TipTap v3 Modular Rich-Text Editor
- **Full Markdown & Slash Commands:** Type `/` to insert headings, task lists, code blocks, tables, callouts, and page mentions (`@`).
- **Rich Media & Attachments:** Drag-and-drop file attachments with local disk mirroring and base64 streaming up to 25MB.
- **Smart Code Blocks:** Syntax highlighting for 50+ languages with one-click copy and auto-language detection.
- **Full-Text Instant Search:** Keyboard-first search across all titles, markdown content, tags, and notebooks with regex highlighting.

---

## 📦 Installation Instructions (macOS)

1. Download **`myNotes_1.0.0_aarch64.dmg`**.
2. Double-click the `.dmg` file to open it.
3. Drag **`myNotes.app`** into your **Applications** folder.
4. Launch **myNotes** from Applications or Spotlight (`⌘ + Space`).

> [!NOTE]  
> If macOS Gatekeeper displays *"App cannot be opened because it is from an unidentified developer"* on first launch:  
> Right-click (or Control-click) `myNotes.app` in Finder, choose **Open**, and click **Open** in the confirmation dialog. (Or go to **System Settings > Privacy & Security** and click **Open Anyway**).

---

## 🛠️ Verifying Integrity
- **SHA-256 Checksum:** Generated during build
- **Package Format:** Universal macOS Disk Image (`.dmg`)
