# myNotes

A desktop app for notes and documents, built with Tauri, Rust, React, TypeScript, and SQLite. Notes are stored on the device. Optional Google Drive sync uses the app’s private Drive folder.

## Source-only distribution

MyNotes is shared as source code. Prebuilt macOS and Windows releases have been
withdrawn; build the app locally on the computer where you plan to use it.
Historical version tags and the changelog remain available. The source version is v1.2.3.

The Mac app is not signed with an Apple Developer ID or notarized by Apple.
Downloaded copies can therefore be blocked by macOS. A local build does not
make a shared DMG trusted on someone else's computer.

## Features

- Nested pages and notebooks, breadcrumbs, drag-and-drop ordering, and batch actions.
- Rich text editing with headings, lists, tasks, tables, code blocks, links, and images.
- Slash commands, page mentions, backlinks, and linked-page previews.
- Page search, find and replace, document outline, word count, and reading time.
- Tags, pinned pages, templates, quick notes, grid and list views.
- Page icons, cover images, focus mode, and full-width pages.
- Attachments up to 25 MB, with open, reveal, and save options.
- Markdown, text, and HTML imports; Markdown export and clipboard copying.
- JSON backup and restore for notes, attachments, and appearance settings.
- Optional Google sign-in, automatic sync, and manual sync.
- Light, dark, and system themes; five accent colors; three editor fonts.
- Keyboard shortcuts and resizable panels.
- One Settings panel for appearance, sync, backup, shortcuts, and updates; sliding panels for navigation and page tools.

AI writing and direct OneNote binary import are not supported. Export OneNote pages as HTML or text before importing them.

## Development

Install Git, Node.js 22 or later, Rust stable, and the
[Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/).
On macOS, install Xcode Command Line Tools. On Windows, install Visual Studio
C++ Build Tools with the Desktop development with C++ workload, Microsoft Edge
WebView2, and Rust's MSVC toolchain. Then run:

```sh
git clone https://github.com/shaik-noor/myNotes.git
cd myNotes
npm ci
npm ci --prefix worker
npm run dev
```

`npm run dev:frontend` starts the frontend alone. Native storage, file dialogs, and Google sign-in require the desktop app; the browser alone cannot provide those features.

To build a local macOS app for your own machine:

```sh
npm run tauri:build -- --bundles app
```

Copy `src-tauri/target.noindex/release/bundle/macos/MyNotes.app` into Applications
and open that copy. This builds the app locally rather than installing a downloaded
DMG. `npm run bundle:dmg` creates a disk image in the project build folder; it
does not replace an installer already mounted from Downloads.

To build a local Windows app on a Windows PC:

```sh
npm run tauri:build -- --no-bundle
```

Open `src-tauri/target.noindex/release/mynotes.exe`. The build uses the host
machine's architecture. Windows binaries must be built on Windows; the MacBook
build command does not produce a Windows application.

See [the interface design notes](DESIGN_NOTES.md) for the responsive layout and a development-only sample preview.

## Validation

```sh
npm run validate
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

`validate` checks frontend and Worker TypeScript, frontend lint, frontend unit tests, and the frontend production build. It expects Worker dependencies to be installed. Rust tests cover database persistence, backup, cloud merge, attachment paths, and ordering.

Build the desktop application with:

```sh
npm run tauri:build
```

The default macOS build is ad-hoc signed for local use and is not notarized by Apple.
It is not intended to be shared as a public download. See
[macOS build and signing details](docs/MACOS_INSTALL.md) for local installation
and possible future notarized distribution.

Build and test a release locally on an Apple Silicon MacBook:

```sh
npm run release:mac
```

This runs validation and native tests, builds and verifies a local test DMG, and
stages the package, installation guide, description, and checksums under
`out/releases/v<version>/`. These are local testing artifacts, not public downloads.
GitHub Actions builds are disabled. See [macOS build and signing details](docs/MACOS_INSTALL.md).

Cargo output goes to `src-tauri/target.noindex` so Spotlight does not list the
development app bundle alongside the installed app in Applications.

## Google Drive configuration

Deploy the OAuth relay using the [Worker deployment guide](worker/README.md). Set `AUTH_SERVER_URL` as described in [.env.example](.env.example). Google client credentials belong in Worker secrets, rather than in the desktop app.

Notes and attachments are uploaded to `mynotes_vault.json` in Google Drive’s Application Data folder. The relay handles sign-in and token exchange. The app does not add end-to-end encryption; local notes, backups, and OAuth credentials need appropriate device protection.

See [the production review](PRODUCTION_REVIEW.md) for known sync limitations, the feature inventory, changes made, and remaining release requirements.

## Source layout

| Path | Purpose |
| --- | --- |
| `frontend/components/notes` | Library, editor, page navigation, and attachments |
| `frontend/components/ui` | Shared interface components |
| `frontend/store` | Notes and navigation state |
| `frontend/services` | Attachments and URL validation |
| `frontend/context` | Theme and font preferences |
| `frontend/tests` | Frontend regression tests |
| `frontend/tauriBridge.ts` | Typed access to native commands |
| `src-tauri/src` | SQLite, attachments, imports, backup, and Drive sync |
| `worker/src` | Google OAuth relay |
