import { expect, test } from 'vitest'

import { parseDocument } from './parser.js'
import { extractFrontmatter, stripFrontmatter } from './frontmatter.js'

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

test('extractFrontmatter returns null without frontmatter', () => {
  expect(extractFrontmatter('# Hi\n\n---\n\nNot frontmatter.\n')).toBeNull()
  expect(extractFrontmatter('---\nnever closed\n')).toBeNull()
})

test('extractFrontmatter parses scalars and reports keys and lines', () => {
  const fm = extractFrontmatter(
    '---\ntitle: Hello world\ndraft: false\nweight: 3\nsub: ~\n---\n# Body\n',
  )
  expect(fm).not.toBeNull()
  expect(fm?.data).toEqual({ title: 'Hello world', draft: false, weight: 3, sub: null })
  expect(fm?.keys).toEqual(['title', 'draft', 'weight', 'sub'])
  expect(fm?.lines).toEqual({ start: 1, end: 6 })
})

test('extractFrontmatter unwraps quoted strings', () => {
  const fm = extractFrontmatter("---\ntitle: \"Hello: world\"\nalt: 'It''s fine'\n---\n")
  expect(fm?.data).toEqual({ title: 'Hello: world', alt: "It's fine" })
})

test('extractFrontmatter parses inline arrays', () => {
  const fm = extractFrontmatter('---\ntags: [a, "b, c", 3]\nempty: []\n---\n')
  expect(fm?.data).toEqual({ tags: ['a', 'b, c', 3], empty: [] })
})

test('extractFrontmatter parses dash lists', () => {
  const fm = extractFrontmatter('---\ntags:\n  - alpha\n  - beta\ntitle: x\n---\n')
  expect(fm?.data).toEqual({ tags: ['alpha', 'beta'], title: 'x' })
})

test('extractFrontmatter keeps block scalars as raw strings', () => {
  const fm = extractFrontmatter('---\nsnippet: |\n  line one\n  line two\n---\n')
  expect(fm?.data).toEqual({ snippet: 'line one\nline two' })
})

test('extractFrontmatter falls back to raw text for nested mappings', () => {
  const fm = extractFrontmatter('---\nauthor:\n  name: Ada\n  url: https://a.dev\n---\n')
  expect(fm?.data).toEqual({ author: 'name: Ada\nurl: https://a.dev' })
})

test('extractFrontmatter handles empty frontmatter and comments', () => {
  expect(extractFrontmatter('---\n---\n# Body\n')?.data).toEqual({})
  const fm = extractFrontmatter('---\n# a comment\ntitle: x\n---\n')
  expect(fm?.data).toEqual({ title: 'x' })
})
