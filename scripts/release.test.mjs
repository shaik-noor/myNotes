import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import test from 'node:test'

const notesScript = resolve('scripts/release-notes.mjs')
const signingScript = resolve('scripts/configure-macos-signing.mjs')

function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'mynotes-release-'))
  mkdirSync(join(dir, 'src-tauri'))
  writeFileSync(join(dir, 'package.json'), '{"version":"1.2.1"}')
  writeFileSync(join(dir, 'src-tauri/tauri.conf.json'), '{"version":"1.2.1"}')
  writeFileSync(join(dir, 'src-tauri/Cargo.toml'), '[package]\nversion = "1.2.1"\n')
  const invoke = (script, env) => spawnSync(process.execPath, [script], {
    cwd: dir,
    // Deliberately exclude real signing credentials from the test environment.
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8'
  })
  try { run(dir, invoke) } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('unnotarized release discloses warning and approval instructions', () => {
  fixture((_dir, invoke) => {
    const result = invoke(notesScript, { RELEASE_TAG: 'v1.2.1', MACOS_SIGNING: 'ad-hoc' })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /not notarized by Apple/)
    assert.match(result.stdout, /Open Anyway/)
    assert.doesNotMatch(result.stdout, /Gatekeeper assessment.*verified/)
  })
})

test('release refuses a mismatched tag or unknown signing mode', () => {
  fixture((_dir, invoke) => {
    assert.notEqual(invoke(notesScript, { RELEASE_TAG: 'main', MACOS_SIGNING: 'ad-hoc' }).status, 0)
    assert.notEqual(invoke(notesScript, { RELEASE_TAG: 'v1.2.1', MACOS_SIGNING: 'typo' }).status, 0)
  })
})

test('release refuses inconsistent native versions', () => {
  fixture((dir, invoke) => {
    writeFileSync(join(dir, 'src-tauri/tauri.conf.json'), '{"version":"1.2.0"}')
    assert.notEqual(invoke(notesScript, { RELEASE_TAG: 'v1.2.1', MACOS_SIGNING: 'ad-hoc' }).status, 0)
  })
})

test('notarized signing fails without credentials and does not write config', () => {
  fixture((dir, invoke) => {
    const result = invoke(signingScript, { MACOS_SIGNING: 'notarized' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Missing GitHub signing secrets/)
    assert.throws(() => readFileSync(join(dir, 'src-tauri/tauri.release.conf.json')))
  })
})

test('ad-hoc mode explicitly configures an ad-hoc hardened signature', () => {
  fixture((dir, invoke) => {
    assert.equal(invoke(signingScript, { MACOS_SIGNING: 'ad-hoc' }).status, 0)
    const config = JSON.parse(readFileSync(join(dir, 'src-tauri/tauri.release.conf.json'), 'utf8'))
    assert.equal(config.bundle.macOS.signingIdentity, '-')
    assert.equal(config.bundle.macOS.hardenedRuntime, true)
  })
})

test('notarized mode rejects an ad-hoc identity even with credential fields present', () => {
  fixture((_dir, invoke) => {
    const result = invoke(signingScript, {
      MACOS_SIGNING: 'notarized', APPLE_CERTIFICATE: 'test',
      APPLE_CERTIFICATE_PASSWORD: 'test', APPLE_SIGNING_IDENTITY: '-',
      APPLE_ID: 'test', APPLE_PASSWORD: 'test', APPLE_TEAM_ID: 'test'
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /require a Developer ID Application/)
  })
})
