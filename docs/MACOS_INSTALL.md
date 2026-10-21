# Building MyNotes on macOS

MyNotes is distributed as source code only. Public Mac and Windows installer
releases have been withdrawn. See the [README](../README.md#development) for
prerequisites and instructions for both operating systems.

## Build and install on your own Mac

Install Git, Node.js 22 or later, Rust stable, and Xcode Command Line Tools:

```sh
xcode-select --install
git clone https://github.com/shaik-noor/myNotes.git
cd myNotes
npm ci
npm ci --prefix worker
npm run tauri:build -- --bundles app
```

Copy `src-tauri/target.noindex/release/bundle/macos/MyNotes.app` into Applications,
then open that copy. The build has been verified on Apple Silicon.

`npm run bundle:dmg` builds a disk image under
`src-tauri/target.noindex/release/bundle/dmg/`. It does not replace a disk image
already mounted from Downloads. `npm run release:mac` produces a verified local
testing package. Neither command signs the app with an Apple Developer ID by default.

## Why old downloads were blocked

The former Mac downloads were ad-hoc signed, without Apple Developer ID signing
or Apple notarization. A downloaded app can therefore trigger the Apple
verification warning with Done and Move to Bin. Building and installing locally
is distinct from sharing that build as a trusted download for other people.

A checksum verifies download integrity; it does not replace notarization.
Apple's explanation: https://support.apple.com/102445

## For maintainers: notarized releases

Removing the verification warning for downloaded releases requires Apple
Developer Program membership, a **Developer ID Application** certificate with its
private key, and Apple notarization credentials.

Install the certificate and private key in the MacBook's login keychain. Set
these environment variables in your local shell (never commit them):

| Variable | Value |
| --- | --- |
| `MACOS_SIGNING` | `notarized` |
| `APPLE_SIGNING_IDENTITY` | Full `Developer ID Application: Name (TEAMID)` identity |
| `APPLE_ID` | Apple account email for notarization |
| `APPLE_PASSWORD` | Apple app-specific password for notarization |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

Run `npm run release:mac`. The local release command overrides the development
signing identity, lets Tauri sign and notarize the app, then verifies the signature,
hardened runtime, stapled ticket, Gatekeeper acceptance, and DMG integrity.
Missing credentials or failed checks stop the command before release staging.
The default `ad-hoc` mode is for local testing only. Public installers are not currently offered.

## Local testing packages

Builds and tests run on the maintainer's MacBook. GitHub Actions build workflows
are removed. `npm run release:mac` stages a local test package and checksums in
`out/releases/v<version>/`; it does not publish anything. Public releases remain
withdrawn unless a future distribution decision changes that policy.

Build output is stored in `src-tauri/target.noindex` to keep generated app bundles
out of Spotlight results. The installed app belongs in `/Applications/MyNotes.app`.

Tauri signing documentation: https://v2.tauri.app/distribute/sign/macos/
