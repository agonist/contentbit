import { expect, test } from 'vitest'

import { defaultRenderMarkdown } from './markdown.js'

test('renders escaped paragraphs without bringing a markdown engine', () => {
  const out = defaultRenderMarkdown('# Hi\n\nHello *world* and ~~gone~~.\n')
  expect(out).toContain('<p># Hi</p>')
  expect(out).toContain('<p>Hello *world* and ~~gone~~.</p>')
  expect(out).not.toContain('<h1>')
  expect(out).not.toContain('<em>')
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
