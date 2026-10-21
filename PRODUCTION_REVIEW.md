# myNotes review

Reviewed on 21 October 2026. This review covers the current source, local builds, automated checks, and a browser inspection of the home screen and settings. The changes improve reliability, security, loading, accessibility, and wording. The app still has release blockers listed below; passing these checks does not establish production readiness.

## Feature inventory

| Area | Current features |
| --- | --- |
| Organization | Nested pages and notebooks, drag-and-drop order, breadcrumbs, batch actions, duplication, navigation history |
| Library | Search, tags, pinned pages, recent pages, grid/list views, templates, local quick-note drafts |
| Editor | Headings, lists, tasks, quotes, tables, syntax-highlighted code, images, links, text formatting, slash commands |
| Navigation inside notes | Page mentions, backlinks, linked-page previews, outline, find and replace |
| Page appearance | Icons, image or gradient covers, full width, focus mode, editor fonts |
| Files | Attachments up to 25 MB, paste/drop, open, reveal, save, and remove |
| Import/export | Markdown, text, and HTML import; Markdown export and copying; JSON backup/restore |
| Sync | Google sign-in through the OAuth relay, Drive Application Data folder, automatic and manual sync, status display |
| Preferences | Light/dark/system themes, five accent colors, three fonts, resizable panels, keyboard shortcuts |

Direct OneNote binary import and AI writing were advertised or exposed without working implementations. Their unused implementation code was removed. OneNote users can export HTML or text and import that file. A real AI feature would require a provider integration, error handling, and a clear explanation of where note content is sent.

## Issues fixed

| Issue | Change |
| --- | --- |
| Backup export could deadlock | Released the attachment query/database lock before reading settings. Added a native regression test. |
| Restore could partially replace data | Notes, attachments, and settings now restore in one transaction. Unsupported versions and failed attachment inserts return errors and roll back. |
| Cloud merge ignored attachment failures | Merges now use one transaction and propagate insert failures. Tests exercise the actual Rust implementation. |
| Child-first data could fail to save | Deferred foreign-key checks within the transaction. Validate duplicate IDs, missing parents, and parent cycles. |
| Removing a parent could delete a retained child’s attachments | Upsert/reparent retained pages before deleting removed pages. Added a regression test. |
| Database reads could silently omit damaged rows | Note and attachment row conversion errors now propagate. |
| Unsafe attachment paths | Validate note and attachment path components; sanitize filenames and control characters. Test traversal attempts. |
| Matching filenames overwrote cached files | Give each attachment its own directory using its ID. |
| Restore could reuse stale cached attachment data | Rebuild opened/revealed files from their database contents. |
| Listing files performed unnecessary payload reads and disk writes | Attachment lists now fetch metadata, without loading base64 contents or recreating files on disk. |
| Save UI reported success too early | Await writes, check native success responses, retain failed edits for retry, and show “Not saved.” Manual save only confirms successful completion. |
| Older full-vault writes could finish after newer writes | Serialize frontend note-save requests. This does not solve concurrent cloud-device writes. |
| Failed loading looked like an empty library | Show a load error and retry action. Block writes while the vault has a load error. |
| Deletion depended on which screen invoked it | Centralize page deletion confirmation and use the latest note state after confirmation. Restore the visible state when a deletion write fails. |
| Confirmation dialogs lacked focus handling | Reuse the existing Radix dialog, focus Cancel initially, support Escape, and fail closed if confirmation is unavailable. |
| Unsafe links could reach browser opening | Validate external URL schemes, reject credential-bearing/control-character URLs, and keep app-internal links out of external opening. |
| Large files were read into frontend memory before rejection | Check attachment size before reading browser File contents. Text/HTML/Markdown imports also have a bounded read. |
| File-open/reveal failures looked successful | Return native opener failures to the UI. |
| Initial bundle loaded the editor on the home screen | Load the editor and linked-page preview on demand. |
| Duplicate TipTap extensions and content-setting effects | Disable StarterKit’s duplicate link/underline extensions and use one guarded content synchronization effect. |
| Selected editor font was ignored | Apply the font preference instead of hard-coding the sans font. Correct the serif font name to Merriweather. |
| Misleading or complicated copy | Remove the hard-coded personal greeting, encryption claim, mobile promises, OneNote claim, and marketing language in key home/settings flows. Clarify that restore replaces the current library. |
| Keyboard access and icon labels | Add keyboard activation for library page cards and templates, label page-action buttons and the link field, and reveal card actions on focus. |
| Dead and redundant code | Remove the simulated AI pipeline, unused OneNote extractor, unused watermark, unused legacy converter wrapper, duplicate tooltip provider, unused imports, redundant JSX comments, and eight unused direct dependencies. |
| Weak cleanup checks | Enable TypeScript unused-variable/parameter checks, migrate Biome configuration, and add Worker type checking plus `npm run validate`. |

Useful comments explaining compatibility, transaction ordering, write serialization, and intentional hook triggers remain. The Markdown preview uses a scoped lint suppression for source-position keys in parsed text; it does not disable that rule across the app.

## Performance evidence

The original production entry JavaScript was approximately **1,779 KB** minified (**565 KB** gzip). After editor splitting and interface simplification, the entry is approximately **603 KB** (**192 KB** gzip), about a **66% reduction** in entry size. This measures build output, not startup time or memory usage.

The editor still has a large lazy chunk, and the cover-image collection adds substantial packaged assets. Cover compression, thumbnails, narrower syntax-language registration, and measurements using a large note library are worthwhile next steps. No claims about cold-start time, idle memory, or large-library responsiveness have been verified.

## Remaining release blockers

| Priority | Finding and consequence | Required work |
| --- | --- | --- |
| High | Cloud merge unions local and remote IDs, without deletion records. Deleted notes or attachments can return during sync. | Add versioned deletion records with migration and multi-device tests. Establish retention and recovery rules before migrating existing vaults. |
| High | Drive sync downloads, merges, and overwrites one JSON file without a conditional revision write. Two computers can overwrite changes. Last-write-wins also discards competing edits to the same page. | Add revision-aware conflict handling and preserved conflict copies; test simultaneous writers, retries, and offline reconnection. |
| High | OAuth access and refresh tokens are stored in SQLite. Notes, backups, and attachments are also readable without app-level encryption. | Move credentials into OS credential storage with a migration. Decide whether end-to-end note encryption is a product requirement; the private Drive folder is not end-to-end encryption. |
| High | Save completion is handled during editing and navigation, but native window/app shutdown and crashes have no verified durable-save guarantee. | Add a tested close/quit save barrier and crash-recovery drafts. Verify closing immediately after typing and after a failed write on each supported OS. |
| High | Native custom commands can read/write user-provided paths. Tauri’s opener/dialog capabilities do not automatically scope custom Rust filesystem commands. | Bind file operations to explicit selections, audit native commands and imported HTML, and test hostile content in the desktop webview. |
| Medium | Auto-sync attempts during another sync can be skipped; network clients have incomplete timeout/retry behavior. | Add a pending-sync flag, bounded requests, backoff, and deterministic failure/recovery tests. |
| Medium | Note deletion cascades database rows but does not comprehensively remove cached files, including older cache layouts. | Add safe orphan-cache cleanup and verify deletion and restore disk behavior. |
| Medium | Notes are saved as full-vault snapshots, and library views render whole collections. | Introduce per-note writes and virtualized lists after measuring representative large libraries. |
| Medium | Release builds lack a demonstrated signing/notarization, update, and cross-platform test process. | Configure signed releases, CI, release rollback, and platform smoke tests. |
| Medium | OAuth relay has type checking but no end-to-end auth regression suite in this repository. | Test state/PKCE validation, timeouts, revoked tokens, rate limits, and deployment configuration. |

These require architecture, data migration, platform testing, or release configuration beyond deleting unused code. The current change preserves the existing cloud response-error edits in `src-tauri/src/cloud.rs`.

## UI/UX redesign completed

The follow-up design pass replaces the dashboard-style Home with a page-first library, simplifies the sidebar, and consolidates preferences and help into one Settings panel. Navigation and outline drawers, Settings, quick notes, templates, and page customization now slide from their respective edges. Compact menus slide from their anchor without zooming. Desktop docked sidebars resize alongside the editor.

The design includes responsive layouts, a stable UI font, revised light/dark palettes, visible keyboard focus, accessible sidebar expansion, and a working initial word count. See [the design notes](DESIGN_NOTES.md) for behavior and verification details.

Remaining UX work includes recoverable deletion (Trash), keyboard alternatives to drag-and-drop ordering, and an unobtrusive indicator for actionable sync failures. The native app still needs platform-specific accessibility, IME, and window-management testing.

## Validation and limits

- `npm run validate`: frontend type check, Worker type check, lint, frontend regression tests, and production frontend build.
- `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`: native regression tests.
- `git diff --check`: whitespace validation.
- npm’s dependency operation reported zero known vulnerabilities for the root dependency graph at review time. This is not a security audit of the Worker or Rust dependencies.
- Browser inspection covered Home, editing, navigation, and settings with development-only sample data and mocked native IPC. Real native storage, file dialogs, Google sign-in/sync, native quit, and packaged application behavior were not exercised end to end.
- The build still warns about large JavaScript chunks. No native release installer was built or published.
