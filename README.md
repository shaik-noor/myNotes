# myNotes

A desktop app for notes and documents, built with Tauri, Rust, React, TypeScript, and SQLite. Notes are stored on the device. Optional Google Drive sync uses the app’s private Drive folder.

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

Install Node.js, Rust, and the platform requirements for Tauri. Then run:

```sh
npm ci
npm ci --prefix worker
npm run dev
```

`npm run dev:frontend` starts the frontend alone. Native storage, file dialogs, and Google sign-in require the desktop app; the browser alone cannot provide those features.

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

The default macOS build is ad-hoc signed and is not notarized by Apple. Downloaded
copies require per-app approval in System Settings → Privacy & Security → Open
Anyway after copying MyNotes into Applications and attempting to open it once.
See [macOS installation and release signing](docs/MACOS_INSTALL.md) for download
verification, installation steps, and notarized release setup.

Build and test a release locally on an Apple Silicon MacBook:

```sh
npm run release:mac
```

This runs validation and native tests, builds and verifies the DMG, and stages the
installer, installation guide, release description, and SHA-256 checksums under
`out/releases/v<version>/`. Upload the DMG, guide, and checksums to GitHub Releases
and use `RELEASE_BODY.md` as the description. GitHub Actions builds are disabled.
Windows installers need a separate Windows build machine.

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
