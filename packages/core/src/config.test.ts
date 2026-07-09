import { expect, test } from 'vitest'

import { defineContentConfig } from './index.js'

test('defineContentConfig normalizes a single content glob', () => {
  expect(
    defineContentConfig({
      content: 'content/**/*.md',
      registry: './blocks/registry.ts',
      links: { resolve: 'same-locale-key' },
    }),
  ).toEqual({
    content: ['content/**/*.md'],
    registry: './blocks/registry.ts',
    links: { resolve: 'same-locale-key' },
  })
})
