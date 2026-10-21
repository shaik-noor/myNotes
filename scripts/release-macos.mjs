import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  throw new Error('This release command builds the Apple Silicon DMG on an Apple Silicon Mac')
}
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
const version = JSON.parse(readFileSync('package.json', 'utf8')).version
const env = {
  ...process.env,
  CARGO_TARGET_DIR: resolve('src-tauri/target.noindex'),
  RELEASE_TAG: `v${version}`,
  MACOS_SIGNING: process.env.MACOS_SIGNING || 'ad-hoc'
}

// Tauri treats present-but-empty Apple variables as supplied credentials.
// Ad-hoc builds must not attempt a certificate import or notarization.
for (const key of Object.keys(env)) {
  if (key.startsWith('APPLE_') && (!env[key] || env.MACOS_SIGNING === 'ad-hoc')) delete env[key]
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit'
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.stderr || ''}`)
  return result.stdout
}

env.SDKROOT = run('xcrun', ['--sdk', 'macosx', '--show-sdk-path'], true).trim()
run(process.execPath, ['--test', 'scripts/test-release.mjs'])
const notes = run(process.execPath, ['scripts/release-notes.mjs'], true)
run(process.execPath, ['scripts/configure-macos-signing.mjs'])
run('npm', ['run', 'validate'])
run('cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml', '--locked'])
run('npm', ['run', 'tauri:build', '--', '--bundles', 'dmg,app', '--config',
  'src-tauri/tauri.release.conf.json', '--ci', '--', '--locked'])
run('bash', ['scripts/verify-macos.sh', env.MACOS_SIGNING])

const output = resolve('out/releases', `v${version}`)
mkdirSync(output, { recursive: true })
const dmg = `MyNotes_${version}_aarch64.dmg`
copyFileSync(`src-tauri/target.noindex/release/bundle/dmg/${dmg}`, resolve(output, dmg))
copyFileSync('docs/MACOS_INSTALL.md', resolve(output, 'MACOS_INSTALL.md'))
writeFileSync(resolve(output, 'RELEASE_BODY.md'), notes)
const sums = [dmg, 'MACOS_INSTALL.md'].map(name => {
  const hash = createHash('sha256').update(readFileSync(resolve(output, name))).digest('hex')
  return `${hash}  ${name}\n`
}).join('')
writeFileSync(resolve(output, 'SHA256SUMS.txt'), sums)
console.log(`Verified local release ready in ${output}`)
console.log('Local testing package only. MyNotes is distributed as source code; this command does not publish a release.')
