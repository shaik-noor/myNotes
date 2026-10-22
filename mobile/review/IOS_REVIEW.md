# iOS code review and verification — 22 October 2026

Reviewed Flutter startup, providers, persistence, cloud merge, editor, task preview, and native iOS configuration. Compared the vault model and merge behavior with the desktop Rust implementation and the OAuth relay source. Production code was not changed.

## Follow-up after Xcode installation

**Final iOS launch verified:** MyNotes is now running in `MyNotes iPhone Duo` on iOS 27.1 (24A94425), simulator ID `4127DBD3-B7C8-471E-AFFE-CB2BE0985F4F`. Flutter completed its simulator build and attached the Dart VM debugger. The home screen was visually verified in Apple's Device Hub; a capture is saved as `review/ios-launch.png`. The simulator and app were left running. The native-launch blockers described below are historical.

Apple's background asset service repeatedly reported the runtime download as stalled. A normal restart and a user-approved force restart did not resume the transfer. The runtime was therefore downloaded directly from the Apple CDN URL returned by its asset catalog. Its SHA-256 matched Apple's metadata (`3fefdcfee46a21c8940bb3bb61eabcc86dffb14b6fb4f019a492b6037c143480`). Apple's `aa patch` tool extracted the runtime asset, and `simctl runtime add` successfully verified/imported its disk image with status `Ready`. This specific runtime reports iPhone Duo as its sole supported device type; an iPhone 18 Pro could not be created with it.

To run this simulator again from `mobile`:

```sh
xcrun simctl boot 4127DBD3-B7C8-471E-AFFE-CB2BE0985F4F
flutter run -d 4127DBD3-B7C8-471E-AFFE-CB2BE0985F4F
```

The `boot` command is unnecessary if the simulator is already booted. Xcode 27.1's simulator UI is available in `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`.

Xcode 27.1 (27A9275) is now installed and selected at `/Applications/Xcode.app/Contents/Developer`. First-launch status succeeds and the iOS 27.1 SDK is available.

`flutter build ios --simulator --debug` now **passes** and produces `build/ios/iphonesimulator/Runner.app` with bundle ID `com.shaik.mynotesMobile`. The executable contains arm64 and x86_64 simulator slices, and `codesign --verify --deep` succeeds. The earlier build blocker below is historical.

During this build Flutter automatically updated `AppDelegate.swift` from `@UIApplicationMain` to `@main` and migrated the application to the UIScene lifecycle, updating the iOS configuration. No Dart application fixes were applied.

At this stage `simctl list devices available` and `simctl list runtimes` are empty. An iOS 27.1 arm64 simulator runtime download was started with `xcodebuild -downloadPlatform iOS -architectureVariant arm64`. Xcode's Components screen confirms iOS 27.1 is downloading. Runtime launch and interactive app verification are pending that installation.

## Android launch follow-up

The installed `Medium_Phone_API_37.0` arm64 Android emulator was booted because iOS still had no installed runtime. The first Android build found conflicting `android/app/build.gradle` and `build.gradle.kts` files. Gradle selected the old Groovy file (`com.shaik.mynotes`, compile SDK 34), while the actual Kotlin activity belongs to `com.shaik.mynotes_mobile`. The obsolete Groovy file was preserved as `review/legacy-android-app-build.gradle`; the existing Kotlin configuration now supplies the matching namespace/application ID and Flutter's SDK levels. Required SDK platforms and NDK 28.2.13676358 were installed through Gradle using the SDK's existing accepted licenses.

**Launch verified:** the Android debug APK built and installed successfully. Android reports `com.shaik.mynotes_mobile/.MainActivity` as the resumed activity. The first cold launch exposed an empty-viewport layout assertion in the Cupertino segmented control. `lib/main.dart` now defers rendering the app's child while the viewport is empty. A hot restart applied the fix, and Flutter's screenshot (`review/android-launch.png`) visually confirms the MyNotes home screen renders correctly. The default widget smoke test now covers an empty viewport followed by a usable one. `flutter analyze` passes and all 8 default tests pass. CMake 3.22.1 was also installed by Gradle. The emulator and app were left running; the original five review findings are separate and remain unresolved.

## Confirmed findings (original review)

1. **[P1] Initial sign-in sync overwrites edits made during download.** `lib/services/sync_service.dart:58` loads a local snapshot before awaiting the download, then writes the merged snapshot at line 78. `SyncProvider.signInWithGoogle` invokes this path without `currentLocalNotes` (`lib/providers/sync_provider.dart:59`). A fake Drive download was paused, a newer edit was saved, and the download resumed: persisted content reverted to the old content. Read the latest local state immediately before committing a merge and preserve edits through upload/completion as well; add concurrency regression coverage.

2. **[P1] Deleted synced notes return on the next sync.** `lib/providers/notes_provider.dart:234` removes notes locally without retaining deletion metadata. The cloud merge treats any remote-only note as a new note and restores it. A probe created a note, deleted it through the provider, and merged its existing cloud copy: the deleted note returned. Introduce deletion records with timestamps and retention rules in a vault format supported by both desktop and mobile. The desktop currently has the same union behavior, so this needs a coordinated change.

3. **[P1] Closing the editor raises a framework error.** `lib/ui/screens/note_editor_screen.dart:75` calls `_saveCurrentState()` during `dispose()`, which reads an ancestor provider through `context` at line 55 after deactivation. Creating a note, typing, and tapping Notes reproduced `Looking up a deactivated widget's ancestor is unsafe`. Cache the provider while the widget is active and use that reference when flushing pending edits. Cover both button navigation and interactive back navigation.

4. **[P2] Checklist taps never update the note.** `lib/ui/widgets/interactive_task_view.dart:92` has an empty `onChanged` handler. Tapping a rendered checkbox never invoked `onContentChanged`. Map each rendered task to its source markdown position and emit the updated content, including coverage for repeated/nested tasks and code blocks.

5. **[P2] Remove cover cannot clear the stored cover.** `lib/models/note.dart:68` uses `coverImage ?? this.coverImage`, so the picker's `copyWith(coverImage: null)` preserves the old value. A direct model probe confirmed the cover remains. Distinguish an omitted argument from an explicitly supplied null; apply the same semantics to other clearable fields.

## Verification results

- `flutter analyze`: no issues reported. Note that `analysis_options.yaml` disables `use_build_context_synchronously`, unused-local reporting, and deprecated-member reporting.
- `flutter test`: all 8 existing tests passed. These cover serialization, merge examples, and the home screen smoke test; they do not cover the five cases above.
- Five focused probes in `ios_review_probe_test.dart`: all failed against the expected behavior, reproducing the findings above. They use mock preferences and a fake Drive service; no real account or cloud data is involved.
- `plutil -lint ios/Runner/Info.plist ios/Runner.xcodeproj/project.pbxproj`: both files parsed successfully. This does not establish that Xcode can build the project.
- `flutter run -d ios`: failed; no matching device. Flutter discovered only macOS.
- `flutter build ios --simulator --debug`: failed with `Application not configured for iOS`. Native build validity remains unverified in this environment.
- `flutter doctor -v`: Xcode installation incomplete. `xcode-select -p` points at `/Library/Developer/CommandLineTools`, `xcrun simctl` is unavailable, and `/Applications` contains `Xcode.appdownload` rather than an installed Xcode application. CocoaPods 1.17.0 is available.

## Reproduce the findings

Run from the `mobile` directory:

```sh
flutter test review/ios_review_probe_test.dart --reporter expanded
```

These are intentionally failing review probes kept outside `test/`, so the existing default test suite is unchanged. Once fixes are implemented, move the corresponding regressions into `test/` and make them pass.

## Complete native verification

Finish installing Xcode. Once `/Applications/Xcode.app` exists, select it and complete first-launch setup:

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

Install an iOS Simulator runtime through Xcode settings and boot an iPhone simulator. Then run from `mobile`:

```sh
flutter doctor -v
flutter devices
flutter build ios --simulator --debug
flutter run -d <simulator-id>
```

If the build still reports that iOS is not configured after Xcode is ready, investigate that separately using verbose build output; the current failure cannot establish a project defect. Device signing, real Google sign-in, Drive interoperability against an actual desktop vault, app background/resume behavior, keyboard layouts, and iPad sharing still require native verification.
