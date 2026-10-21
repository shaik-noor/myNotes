import { writeFileSync } from 'node:fs'

const mode = process.env.MACOS_SIGNING
if (!['ad-hoc', 'notarized'].includes(mode)) {
  throw new Error('MACOS_SIGNING must be ad-hoc or notarized')
}

let signingIdentity = '-'
if (mode === 'notarized') {
  const required = [
    'APPLE_CERTIFICATE',
    'APPLE_CERTIFICATE_PASSWORD',
    'APPLE_SIGNING_IDENTITY',
    'APPLE_ID',
    'APPLE_PASSWORD',
    'APPLE_TEAM_ID'
  ]
  const missing = required.filter(name => !process.env[name]?.trim())
  if (missing.length) throw new Error(`Missing GitHub signing secrets: ${missing.join(', ')}`)
  signingIdentity = process.env.APPLE_SIGNING_IDENTITY
  if (!signingIdentity.startsWith('Developer ID Application:')) {
    throw new Error('Notarized releases require a Developer ID Application signing identity')
  }
}

// Explicitly override the development identity for a notarized release.
writeFileSync(
  'src-tauri/tauri.release.conf.json',
  `${JSON.stringify({ bundle: { macOS: { signingIdentity, hardenedRuntime: true } } }, null, 2)}\n`
)
console.log(`macOS signing mode: ${mode}`)
