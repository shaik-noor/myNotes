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
  console.log(`**Local macOS testing package: ad-hoc signed, not notarized by Apple.**

MyNotes is distributed as source code only. Public macOS and Windows installer releases have been withdrawn. Build locally on the computer where you plan to use it; this package is not a public installer.

Sharing an ad-hoc build does not make it trusted by macOS. See MACOS_INSTALL.md for local build instructions.\n`)
} else {
  console.log('**macOS: Developer ID signed and notarized.** The local release process verified the app signature, stapled notarization ticket, Gatekeeper assessment, and DMG integrity.\n')
}
console.log(`Built and tested locally on the maintainer's MacBook. This local test package contains a macOS Apple Silicon (M-series) DMG and is not published automatically.\n
SHA256SUMS.txt contains checksums for the installers and installation guide. Verify a Mac download with:

\`\`\`sh
shasum -a 256 -c SHA256SUMS.txt --ignore-missing
\`\`\`

Checksums detect incomplete or altered downloads; they do not replace Apple notarization.

Changelog: https://github.com/shaik-noor/myNotes/blob/main/RELEASE_NOTES.md`)
