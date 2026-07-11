import assert from 'node:assert/strict'
import test from 'node:test'

import { starterVersionIssues, syncStarterManifest } from './starter-version-state.mjs'

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
