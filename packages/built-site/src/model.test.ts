import { expect, test } from 'vitest'

import { pagePath, pagePathFromFile } from './index.js'

test('pagePath drops the query and hash and percent-decodes each segment', () => {
  expect(pagePath('/')).toBe('/')
  expect(pagePath('/blog/first-post/')).toBe('/blog/first-post/')
  expect(pagePath('/blog/first-post/?ref=home#intro')).toBe('/blog/first-post/')
  expect(pagePath('/docs#install')).toBe('/docs')
  expect(pagePath('/fr/caf%C3%A9/')).toBe('/fr/café/')
  expect(pagePath('/c%2B%2B')).toBe('/c++')
})

test('pagePath keeps a segment whose percent escape is malformed as written', () => {
  expect(pagePath('/100%/off')).toBe('/100%/off')
})

test('pagePath rejects a value without a leading slash', () => {
  expect(() => pagePath('blog/first-post/')).toThrow(TypeError)
  expect(() => pagePath('https://example.com/')).toThrow(TypeError)
  expect(() => pagePath('#intro')).toThrow(TypeError)
  expect(() => pagePath('')).toThrow(TypeError)
})

test('pagePathFromFile maps index files to directory paths and other files to their name', () => {
  expect(pagePathFromFile('index.html')).toBe('/')
  expect(pagePathFromFile('blog/first-post/index.html')).toBe('/blog/first-post/')
  expect(pagePathFromFile('about.html')).toBe('/about')
  expect(pagePathFromFile('docs/getting-started.html')).toBe('/docs/getting-started')
  expect(pagePathFromFile('blog\\first-post\\index.html')).toBe('/blog/first-post/')
  expect(pagePathFromFile('./about.html')).toBe('/about')
})
