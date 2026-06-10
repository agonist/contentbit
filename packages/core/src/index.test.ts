import { expect, test } from 'vitest'

import { VERSION } from './version.js'

test('package exports the version from package.json', async () => {
  const pkg = await import('../package.json')
  expect(VERSION).toBe(pkg.default.version)
})
