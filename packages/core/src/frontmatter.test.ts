import { expect, test } from 'vitest'

import { parseDocument } from './parser.js'
import { stripFrontmatter } from './frontmatter.js'

test('blanks a frontmatter block, preserving line positions', () => {
  const out = stripFrontmatter('---\ntitle: Hello\n---\n# Body\n')
  expect(out).toBe('\n\n\n# Body\n')
})

test('handles empty frontmatter', () => {
  expect(stripFrontmatter('---\n---\n# Body\n')).toBe('\n\n# Body\n')
})

test('handles trailing whitespace on the fences', () => {
  expect(stripFrontmatter('---  \ntitle: x\n---\t\n# Body\n')).toBe('\n\n\n# Body\n')
})

test('handles CRLF line endings', () => {
  // The \r goes with the rest of the blanked line; the \n (what the parser
  // splits on) survives, so line numbers are unaffected.
  const out = stripFrontmatter('---\r\ntitle: x\r\n---\r\n# Body\r\n')
  expect(out).toBe('\n\n\n# Body\r\n')
})

test('handles frontmatter closing at end of file', () => {
  expect(stripFrontmatter('---\ntitle: x\n---')).toBe('\n\n')
})

test('leaves sources without frontmatter alone', () => {
  expect(stripFrontmatter('# Hi\n\n---\n\nA thematic break, not frontmatter.\n')).toBe(
    '# Hi\n\n---\n\nA thematic break, not frontmatter.\n',
  )
})

test('leaves an unclosed opening fence alone', () => {
  expect(stripFrontmatter('---\ntitle: never closed\n')).toBe('---\ntitle: never closed\n')
})

test('block syntax inside frontmatter is not parsed as content', () => {
  const source = '---\nsnippet: |\n  :::note\n---\n\nProse.\n'
  const { document, diagnostics } = parseDocument(stripFrontmatter(source))
  expect(diagnostics).toEqual([])
  expect(document.children.every((c) => c.type === 'markdown')).toBe(true)
})

test('diagnostic line numbers are unchanged after stripping', () => {
  const source = '---\ntitle: x\n---\n\n:::callout\nBody.\n:::\n'
  const { document } = parseDocument(stripFrontmatter(source))
  const block = document.children.find((c) => c.type === 'block')
  expect(block?.position.start.line).toBe(5)
})
