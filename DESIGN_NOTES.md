# Interface redesign

Updated 21 October 2026.

The interface now gives writing and finding pages priority over dashboard decoration and app controls.

## Organization

- Home starts with your pages, search, and simple filters. The default list shows the latest edited pages first; grid view remains available and remembers your choice.
- Large statistics cards, duplicate pinned-page sections, background glows, and the always-visible template gallery were removed.
- Quick notes, templates, notebook creation, and import stay available without occupying the library.
- The sidebar contains Home, page creation, search, a notebook filter, optional tags, and the page tree. Tags are collapsed by default.
- Settings is the single destination for appearance, cloud sync, backups, keyboard shortcuts, release notes, and app information. Extra top-bar buttons for those destinations were removed.
- Editor fonts apply to writing; the navigation and menus keep a consistent UI font.

## Panel behavior

Navigation slides from the left. Settings, templates, quick notes, page customization, and the outline slide from the right. Docked desktop navigation and outline panels animate their width and content position, allowing the editor to resize alongside them.

Compact dropdowns, selects, context menus, and popovers slide a short distance from their anchor. They no longer zoom in. Confirmation dialogs retain their focused confirmation behavior.

The shared sheet component provides focus trapping, Escape dismissal, focus restoration, an overlay, and entry/exit animations. Hidden docked panels are inert. Motion is reduced when the OS requests reduced motion.

## Responsive behavior

- Below 900 px, navigation becomes a dismissible drawer. Choosing a page closes it.
- Below 1280 px, the outline opens as a drawer rather than reducing the writing area.
- Settings uses a compact section menu on narrow screens and section navigation on wider screens.
- Library controls wrap, page text truncates, and all page actions remain reachable.
- Native window minimum width is now 360 px. Browser layout was also checked at 320 px.

## Color and accessibility

The five palettes use darker accents with white button labels in light mode and lighter accents with dark labels in dark mode. Calculated solid accent/button-label contrast ranges from approximately 6.4:1 to 9.5:1; this does not certify every color combination in the app. Muted text contrast, keyboard focus rings, and dark dialog text inheritance were improved.

Sidebar expansion and page selection are separate buttons. Mobile page actions remain visible. Page content has an accessible textbox label. Loaded editor content now updates the word counter correctly. System theme follows OS changes while the app is open.

## Verification

Browser checks used development-only sample notes, with no access to a native database:

- Home and writing layouts at phone, tablet, laptop, and desktop widths: 320, 360, 390, 768, 1280, and 1440 px.
- No document horizontal overflow in the checked layouts.
- Left/right panel animation names, desktop width transitions, anchored-menu sliding, Escape dismissal, and outline navigation.
- Page title edit and save through mocked native IPC.
- Light and dark appearance; calculated palette contrast.
- Frontend/Worker type checks, lint, unit tests, production frontend build, and Rust tests.

Run `npm run dev:frontend` and visit `http://127.0.0.1:5173/?preview` to inspect sample notes. Add `&empty` for the empty-library state. The preview is available only in development; its fixtures are excluded from production builds. Native database, Google sync, signed installers, and mobile OS applications were not tested by this browser preview.

## Native title bar follow-up

The native app appearance now follows the saved Light, Dark, or System preference at startup and when settings change. The custom title bar no longer draws an extra horizontal divider, and the document toolbar uses a softer separator without repeating the page title. Browser color scheme and fallback backgrounds follow the same theme. The app root uses the window’s percentage height to avoid a separate viewport-sized surface during native fullscreen resizing. Native fullscreen appearance still needs a visual recheck on macOS; computer-use permissions were unavailable during this follow-up.


## Editor interaction follow-up

- Loading uses a workspace skeleton; opening a page uses a short fade without overlapping two editable documents. Editor extensions stay memoized while typing.
- Task item styles now target TipTap's editable node-view markup. Checkboxes align with the first text line, including wrapped and nested tasks. Paragraph margins inside lists, quotes, and table cells are consistent.
- Formatting, slash commands, page mentions, tags, image loading, focus mode, and collapsible sections use restrained feedback. Text does not animate on each keystroke. Shared CSS and Framer Motion configuration honor the OS reduced-motion preference.
- Find and replace expands below the document toolbar and stays visible while the writing canvas scrolls. It fits narrow screens, tracks match counts as content changes, and inserts replacement text literally.
- Code language selection is inside each code block. The redundant floating language toolbar was removed. Copy feedback keeps a stable width and handles clipboard errors.
- Formatting buttons support keyboard activation and announce their pressed state. Linked-page creation preserves the original text if the document changes while the new page is being created.
- Images fade in after loading and show a readable fallback on failure. Drag handles now have matching styles.
- A save/reopen check exposed a Markdown serialization bug that merged tables into preceding lists. Tables now preserve their block boundaries; two regression tests cover adjacent paragraphs and numbered lists.

Verification for this follow-up: 18 frontend tests, frontend/worker type checks, lint, production build, plus browser sample checks at 390 px and 1280 px. Browser checks covered wrapped/nested task alignment, keyboard formatting, literal replacement and match counts, code language changes, and table save/reopen through mocked IPC. Native macOS rendering and real attachment loading still need a desktop check. The production build still reports large JavaScript chunks.

## Title bar organization

The title bar now centers the myNotes name and icon instead of repeating the page title. The repeated sidebar brand row was removed. Navigation stays on the left and Settings stays on the right. macOS retains its native close, minimize, and fullscreen controls with a configured inset of 16 px horizontally and 24 px vertically; navigation reserves space for them within the 48 px toolbar. Window dragging is explicitly allowed for the main window. Browser measurements confirmed exact brand centering and no title bar overflow at 360 px and 1280 px. Frontend validation and offline Cargo check passed. Native control placement requires a desktop restart and still needs a macOS visual check; browser previews cannot display those controls.

## Dark title bar separator

The editor toolbar's bottom divider was removed. On macOS, the live NSWindow now uses a transparent title bar and disables the automatic native title bar separator on macOS 11 and later. The platform calls run on Tauri's main thread, with the API guarded for older macOS versions. Dark preview inspection confirmed a continuous background and zero top/bottom title bar border widths. Frontend validation (18 tests) and native Cargo check passed. The native separator change still needs a visual check after restarting the desktop app.

## Outer native window frame

The later desktop screenshot marks the outside window perimeter, distinct from the title bar separator. The macOS NSWindow now uses `setOpaque(false)` and a clear native background while the HTML/body/app surfaces remain opaque and theme-colored. Native decorations, resizing, shadows, and traffic lights remain enabled. This targets the light inner frame highlight reported for opaque macOS windows in [Tauri issue 14394](https://github.com/tauri-apps/tauri/issues/14394); that report is supporting evidence, not proof of this app's rendered result. All 11 Rust tests pass, including native compilation. The perimeter cannot be verified in the browser preview and still needs visual confirmation in the restarted desktop app. Do not represent the earlier browser screenshots as proof that the native outer frame is gone.

## Shared panel safe area review

All native macOS sheets now start below the 48 px application toolbar. This applies to Settings, navigation, quick notes, cover and icon pickers, and the page outline, including full-width sheets on narrow windows. It replaces the navigation-only heading inset. Panel header text reserves space for the shared close button. Sheet controls use one inset keyboard-focus outline to avoid clipping against scroll containers. Confirmation dialogs now keep viewport margins, scroll within short windows, reserve space for their close control, and wrap actions. Popovers are constrained to viewport width and available height. Opening Settings from the compact sidebar closes navigation first.

Frontend type checks, lint, 18 tests, and macOS application bundling passed. Native UI automation was unavailable during this review; final macOS rendering is not visually certified by browser or build checks.

## Native verification and display name

The rebuilt MyNotes app was opened directly from its bundle and checked using native UI automation. Settings was inspected at 1260 px and 730 px window widths, including the full-width layout; its heading and close button remain below the native title-bar region. Navigation was checked at 780 px with one close button, the shared logo and MyNotes wordmark, and a focused search field whose outline remains inside its border. Panel close actions worked. Screenshots are saved in `resources/native-settings-verified.png` and `resources/native-sidebar-verified.png`. The app menu, window, UI branding, and user-facing messages use MyNotes. The older Applications copy was not replaced.
