import { readFileSync } from 'node:fs'

const read = path => JSON.parse(readFileSync(path, 'utf8'))
const version = read('package.json').version
const tag = process.env.RELEASE_TAG
const mode = process.env.MACOS_SIGNING
if (tag !== `v${version}`) throw new Error(`Release tag must match package version v${version}`)
if (read('src-tauri/tauri.conf.json').version !== version) {
  throw new Error('Tauri and npm versions must match')
}
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8')
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"\s*$/m)?.[1]
if (cargoVersion !== version) throw new Error('Cargo version must match npm')
if (!['ad-hoc', 'notarized'].includes(mode)) throw new Error('Unknown macOS signing mode')

console.log(`# MyNotes ${tag}\n`)
if (mode === 'ad-hoc') {
  console.log(`**macOS: ad-hoc signed, not notarized by Apple.** macOS will display an Apple verification warning. This release does not remove that warning.\n
1. Open the DMG and drag MyNotes into Applications.
2. Open MyNotes from Applications once, then dismiss the verification alert with Done.
3. If you trust this download, go to System Settings → Privacy & Security → Open Anyway, and confirm Open.

Use this per-app approval only for a download you trust. Do not disable Gatekeeper globally.
See the attached MACOS_INSTALL.md for details and Apple's instructions.\n`)
} else {
  console.log('**macOS: Developer ID signed and notarized.** The app signature, stapled notarization ticket, Gatekeeper assessment, and DMG integrity were verified before publication.\n')
}
console.log(`The macOS DMG supports Apple Silicon (M-series Macs). Windows installers support x64.\n
SHA256SUMS.txt contains checksums for the installers and installation guide. Verify a Mac download with:

\`\`\`sh
shasum -a 256 -c SHA256SUMS.txt --ignore-missing
\`\`\`

Checksums detect incomplete or altered downloads; they do not replace Apple notarization.

Release history: https://github.com/shaik-noor/myNotes/blob/${tag}/RELEASE_NOTES.md`)
