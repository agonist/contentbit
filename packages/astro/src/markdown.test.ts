import { expect, test } from 'vitest'

import { defaultRenderMarkdown } from './markdown.js'

test('renders GFM markdown', () => {
  const out = defaultRenderMarkdown('# Hi\n\nHello *world* and ~~gone~~.\n')
  expect(out).toContain('<h1>Hi</h1>')
  expect(out).toContain('<em>world</em>')
  expect(out).toContain('<del>gone</del>')
})

test('escapes block-level raw HTML', () => {
  const out = defaultRenderMarkdown('before\n\n<script>alert(1)</script>\n\nafter\n')
  expect(out).not.toContain('<script>')
  expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
})

test('escapes inline raw HTML', () => {
  const out = defaultRenderMarkdown('hello <img src=x onerror=alert(1)> world\n')
  expect(out).not.toContain('<img')
  expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;')
})
