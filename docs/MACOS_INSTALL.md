# Installing MyNotes on macOS

The macOS download is for Apple Silicon (M-series Macs). Check the release notes
for its signing status. Releases marked **ad-hoc signed** lack an Apple Developer
ID certificate and Apple notarization. For those releases, macOS displays
“Apple could not verify MyNotes is free of malware.”
This warning alone does not mean the DMG is corrupted, and an ad-hoc signature
does not establish that Apple has checked the app.

## Install a download you trust

1. Download the DMG from https://github.com/shaik-noor/myNotes/releases.
2. Open the DMG and drag **MyNotes** into **Applications**.
3. Open **MyNotes from Applications**, then click **Done** on the verification alert.
4. If you trust the download, open **System Settings → Privacy & Security**.
   Scroll to the blocked-app message and click **Open Anyway**.
5. Authenticate if requested and confirm **Open**. macOS saves the exception for
   that app. An updated download may require approval again.

Apple describes this per-app exception here:
https://support.apple.com/102445

Do not disable Gatekeeper globally. If macOS reports detected malware, or the
download is from an unexpected source, do not approve it using these steps.

## Check download integrity

Download `SHA256SUMS.txt` beside the installer and run this in the download folder:

```sh
shasum -a 256 -c SHA256SUMS.txt --ignore-missing
hdiutil verify MyNotes_1.2.1_aarch64.dmg
```

A matching checksum and a successful DMG verification confirm download integrity.
They do not establish Apple notarization or guarantee the absence of malware.

## For maintainers: notarized releases

Removing the verification warning for downloaded releases requires Apple
Developer Program membership, a **Developer ID Application** certificate with its
private key, and Apple notarization credentials.

Add these GitHub Actions repository secrets under **Settings → Secrets and
variables → Actions** (never commit them or paste them into an issue):

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | Base64-encoded exported `.p12` certificate and private key |
| `APPLE_CERTIFICATE_PASSWORD` | Password protecting that `.p12` export |
| `APPLE_SIGNING_IDENTITY` | Full `Developer ID Application: Name (TEAMID)` identity |
| `APPLE_ID` | Apple account email for notarization |
| `APPLE_PASSWORD` | Apple app-specific password for notarization |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

Set the Actions repository **variable** `MACOS_SIGNING` to `notarized` for future
tag-triggered releases, or select `notarized` when manually running the Release
workflow against an existing version tag. The default is `ad-hoc`; its release
notes explicitly disclose the required manual approval.

The workflow overrides the development signing identity, lets Tauri sign and
notarize the app, then verifies the signature, hardened runtime, stapled ticket,
Gatekeeper acceptance, and DMG integrity. Missing credentials or failed checks
stop publication. Both macOS and Windows builds must pass before publication.
Existing published releases are not overwritten; use a new version tag.

Tauri signing documentation: https://v2.tauri.app/distribute/sign/macos/
