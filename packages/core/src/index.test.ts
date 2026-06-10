import { expect, test } from 'vitest'

import { VERSION } from './version.js'

test('package exports a version', () => {
  expect(VERSION).toBe('0.0.1')
})
