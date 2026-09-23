import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isReleaseVersion,
  starterVersionIssues,
  syncStarterManifest,
} from './starter-version-state.mjs'

const pkg = {
  dependencies: { '@contentbit/core': '^0.7.0', react: '^19' },
  devDependencies: { contentbit: '^0.7.0' },
}
const lockfile = `importers:

  .:
    dependencies:
      '@contentbit/core':
        specifier: ^0.7.0
        version: 0.7.0
      react:
        specifier: ^19
        version: 19.2.6
    devDependencies:
      contentbit:
        specifier: ^0.7.0
        version: 0.7.0

packages:
`

test('accepts coherent manifest and lockfile versions', () => {
  assert.deepEqual(starterVersionIssues(pkg, lockfile), [])
})

test('rejects mismatched manifest ranges and stale lockfile resolutions', () => {
  const mismatched = structuredClone(pkg)
  mismatched.devDependencies.contentbit = '^0.8.0'
  assert.deepEqual(starterVersionIssues(mismatched, lockfile), [
    'devDependencies.contentbit is ^0.8.0, expected ^0.7.0',
    'pnpm-lock.yaml contentbit specifier is ^0.7.0, expected ^0.8.0',
  ])

  const stale = lockfile.replaceAll('version: 0.7.0', 'version: 0.6.1')
  assert.deepEqual(starterVersionIssues(pkg, stale), [
    'pnpm-lock.yaml @contentbit/core resolves 0.6.1, expected 0.7.0',
    'pnpm-lock.yaml contentbit resolves 0.6.1, expected 0.7.0',
  ])
})

test('sync changes only Contentbit ranges and is idempotent', () => {
  const synced = syncStarterManifest(pkg, '0.8.0')
  assert.deepEqual(synced, {
    dependencies: { '@contentbit/core': '^0.8.0', react: '^19' },
    devDependencies: { contentbit: '^0.8.0' },
  })
  assert.deepEqual(syncStarterManifest(synced, '0.8.0'), synced)
  assert.equal(pkg.dependencies['@contentbit/core'], '^0.7.0')
})

test('pins prerelease starters and accepts their coherent lockfiles', () => {
  const synced = syncStarterManifest(pkg, '1.0.0-rc.0')
  assert.equal(synced.dependencies['@contentbit/core'], '1.0.0-rc.0')
  assert.equal(synced.devDependencies.contentbit, '1.0.0-rc.0')
  const candidateLock = lockfile
    .replaceAll('^0.7.0', '1.0.0-rc.0')
    .replaceAll('0.7.0', '1.0.0-rc.0')
  assert.deepEqual(starterVersionIssues(synced, candidateLock), [])
  assert.deepEqual(syncStarterManifest(synced, '1.0.0-rc.0'), synced)
  const stale = candidateLock.replaceAll('version: 1.0.0-rc.0', 'version: 0.7.2')
  assert.equal(starterVersionIssues(synced, stale).length, 2)
  assert.equal(syncStarterManifest(synced, '1.0.0').dependencies['@contentbit/core'], '^1.0.0')
})

test('rejects malformed release versions and floating prerelease ranges', () => {
  for (const version of [
    undefined,
    'latest',
    '1.0',
    '01.0.0',
    '1.0.0-rc.01',
    '1.0.0-',
    '1.0.0-rc..0',
  ]) {
    assert.equal(isReleaseVersion(version), false)
    assert.throws(() => syncStarterManifest(pkg, version), /Invalid release version/)
  }
  const floating = {
    dependencies: { '@contentbit/core': '^1.0.0-rc.0' },
  }
  assert.match(starterVersionIssues(floating, '')[0], /exact prerelease version/)
})
