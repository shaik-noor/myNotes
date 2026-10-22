# MyNotes Mobile (Flutter iOS) 📱☁️

A high-performance, native iOS knowledge and document workspace application built with Flutter, designed according to Apple's Human Interface Guidelines (HIG) with seamless private Google Drive cloud synchronization interoperable with the MyNotes Tauri macOS/Desktop application.

---

## 🌟 Key Architecture & Highlights

### 1. Unified Google Drive Cloud Sync Architecture
- **Single Source of Truth**: The mobile app uses Google Drive's private `appDataFolder` as its primary cloud data source.
- **Interoperability**: Shares the exact same vault format (`spaces=appDataFolder/mynotes_vault.json`) with the desktop Tauri application.
- **Deterministic 3-Way Conflict Resolution**: Implements the identical RFC3339 timestamp-based merge algorithm from the desktop app (`src-tauri/src/db.rs`):
  - Later `updatedAt` timestamp always wins on conflicting notes.
  - Non-overlapping notes created on either desktop or mobile are preserved and merged.
  - Note attachments are unified by unique attachment ID.
- **Offline-First Resilience**: Even with intermittent network connectivity, notes are immediately saved to high-speed local cache (`StorageService`) and automatically synced to Google Drive in the background when connectivity resumes.
- **Secure Authentication**: Built with Google OAuth 2.0 PKCE and relays through the secure Cloudflare Worker edge relay (`https://auth.noruj.com`).

---

## 🎨 Native Apple iOS UI/UX

- **Cupertino HIG Aesthetics**:
  - Translucent frosted glass navigation bars with dynamic background blur (`BackdropFilter`).
  - Native iOS collapsing large title navigation (`CupertinoSliverNavigationBar`).
  - Cupertino sliding segmented control for quick switching between *All Notes*, *Pinned*, and *Notebooks*.
  - Native iOS swipe gestures: Swipe right to Pin/Unpin, Swipe left to Delete with confirmation.
  - Pull-to-refresh (`CupertinoSliverRefreshControl`) triggering instant Google Drive synchronization.
  - Native Apple haptic feedback (`HapticFeedback.lightImpact`, `mediumImpact`, `selectionClick`) on all interactions.
- **Rich Markdown Writing & Accessory Keyboard Toolbar**:
  - Docked iOS keyboard accessory toolbar with instant Markdown formatting buttons:
    - Headings (`H1`, `H2`, `H3`)
    - Styling (`Bold`, `Italic`, `Strikethrough`, `Inline Code`)
    - Checklists & Tasks (`- [ ] `)
    - Lists (`Bullet`, `Numbered`, `Quote`, `Divider`, `Code Block`)
    - Links and Page Mentions (`[[Page Name]]`)
  - **Interactive Checklists**: Tap checkboxes directly in note preview to toggle tasks done/undone inline.
- **Visual Customization**:
  - Preset Cover Banners (Purple Horizon, Aurora, Sunset Glow, Ocean Breeze, Deep Forest, Crimson Amber, Slate Minimal).
  - Emoji Note Icon Picker with categorized selection.
  - 5 Theme Palettes matching desktop: **Blue**, **Purple**, **Amber**, **Emerald**, **Rose**.
  - Dynamic System Dark & Light mode following iOS system brightness.
- **Hierarchical Notes & Notebooks**:
  - Full parent/child page nesting (`parentId`).
  - Interactive breadcrumbs trail for nested subpages.
  - Subpages grid & list with 1-tap subpage creation.
  - Backlinks tracking: automatically surfaces pages mentioning the current note.
- **Templates & Productivity**:
  - Built-in templates: Meeting Notes, Project Spec, Daily Journal, Technical Runbook, Idea Sandbox, Weekly Sprint Planning.
  - Quick Scratchpad sheet for instant thought capture.
  - Document Info & Metrics: Realtime word count, character count, and estimated reading time.

---

## 📁 Directory Structure

```text
mobile/
├── lib/
│   ├── main.dart                          # App entry point, MultiProvider setup
│   ├── constants/
│   │   ├── app_colors.dart                # Apple HIG dynamic colors & 5 palettes
│   │   ├── banner_presets.dart            # Cover gradient presets & emoji list
│   │   └── note_templates.dart            # Built-in note starter templates
│   ├── models/
│   │   ├── note.dart                      # Note model matching desktop Rust schema
│   │   ├── attachment.dart                # Attachment row model
│   │   ├── app_settings.dart              # Appearance and preferences model
│   │   ├── backup_manifest.dart           # mynotes_vault.json schema (v1)
│   │   └── sync_result.dart               # CloudSyncResult & CloudSyncConfig
│   ├── services/
│   │   ├── storage_service.dart           # Local offline persistence
│   │   ├── auth_service.dart              # Google OAuth 2.0 PKCE & edge relay
│   │   ├── google_drive_service.dart      # REST API for Drive appDataFolder
│   │   └── sync_service.dart              # Bi-directional 3-way merge engine
│   ├── providers/
│   │   ├── notes_provider.dart            # Hierarchical notes store & filtering
│   │   ├── sync_provider.dart             # Google Drive sync reactive state
│   │   └── settings_provider.dart         # Theme and appearance state
│   └── ui/
│       ├── theme/
│       │   └── ios_theme.dart             # Cupertino & Material 3 themes
│       ├── screens/
│       │   ├── home_screen.dart           # Large title note list & filters
│       │   ├── note_editor_screen.dart    # Full Markdown editor & preview
│       │   ├── templates_screen.dart      # Starter template gallery
│       │   ├── settings_screen.dart       # Appearance & Google Drive management
│       │   ├── google_auth_screen.dart    # Dedicated Drive connect flow
│       │   ├── note_info_sheet.dart       # Words, read time, and tags manager
│       │   └── quick_note_sheet.dart      # Instant scratchpad modal
│       └── widgets/
│           ├── sync_status_badge.dart     # Cloud sync indicator in nav bar
│           ├── note_list_item.dart        # Apple style row with swipe actions
│           ├── markdown_toolbar.dart      # Keyboard accessory formatting bar
│           ├── cover_banner_picker.dart   # Gradient cover selector
│           ├── emoji_picker_sheet.dart    # Emoji icon picker
│           └── interactive_task_view.dart # Rendered markdown with checkboxes
├── test/
│   ├── models/
│   │   ├── note_test.dart                 # Note serialization tests
│   │   └── manifest_test.dart             # Vault manifest compatibility tests
│   └── services/
│       └── conflict_resolution_test.dart  # 3-way merge algorithm tests
├── ios/                                   # Native iOS Runner project
└── android/                               # Ready for Android builds
```

---

## 🚀 Getting Started

### Prerequisites
1. **Flutter SDK** (`>=3.19.0`)
2. **Xcode** (for iOS simulator and device builds)
3. **CocoaPods**

### Running on iOS Simulator or Device
```bash
# 1. Navigate to the mobile directory
cd mobile

# 2. Install dependencies
flutter pub get

# 3. Install iOS CocoaPods
cd ios && pod install && cd ..

# 4. Run on connected iOS device or simulator
flutter run -d ios
```

### Running Unit Tests
```bash
cd mobile
flutter test
```

### Android Deployment (Future)
The project structure already includes `android/` with configured permissions, internet access, and gradle configs. To run on Android:
```bash
flutter run -d android
```
