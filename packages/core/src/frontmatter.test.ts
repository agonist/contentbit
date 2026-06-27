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

test('extractFrontmatter parses simple dash-list mappings', () => {
  const fm = extractFrontmatter(
    '---\nlinksTo:\n  - locale: en\n    slug: sourdough-pizza\n  - key: pizza-flour\n---\n',
  )
  expect(fm?.data.linksTo).toEqual([
    { locale: 'en', slug: 'sourdough-pizza' },
    { key: 'pizza-flour' },
  ])
})

test('extractFrontmatter parses inline mappings', () => {
  const fm = extractFrontmatter('---\nlinksTo:\n  - { locale: en, slug: sourdough-pizza }\n---\n')
  expect(fm?.data.linksTo).toEqual([{ locale: 'en', slug: 'sourdough-pizza' }])
})

test('extractFrontmatter keeps block scalars as raw strings', () => {
  const fm = extractFrontmatter('---\nsnippet: |\n  line one\n  line two\n---\n')
  expect(fm?.data).toEqual({ snippet: 'line one\nline two' })
})

test('parses a one-level nested mapping into an object', () => {
  const fm = extractFrontmatter(
    '---\nkeywords:\n  primary: how to make pizza dough\n  secondary: [easy dough, homemade dough]\n---\nBody\n',
  )
  expect(fm?.data.keywords).toEqual({
    primary: 'how to make pizza dough',
    secondary: ['easy dough', 'homemade dough'],
  })
})

test('parses nested mapping dash-list values', () => {
  const fm = extractFrontmatter(
    '---\nseoKeywords:\n  primary: cooking oil smoke points\n  secondary:\n    - oil smoke point chart\n    - high smoke point oils\n  lsi:\n    - avocado oil smoke point\n---\nBody\n',
  )
  expect(fm?.data.seoKeywords).toEqual({
    primary: 'cooking oil smoke points',
    secondary: ['oil smoke point chart', 'high smoke point oils'],
    lsi: ['avocado oil smoke point'],
  })
})

test('nested mapping coexists with flat keys and dash lists', () => {
  const fm = extractFrontmatter(
    '---\nslug: a\nlinksTo:\n  - b\n  - c\nkeywords:\n  primary: x\n---\nBody\n',
  )
  expect(fm?.data.slug).toBe('a')
  expect(fm?.data.linksTo).toEqual(['b', 'c'])
  expect(fm?.data.keywords).toEqual({ primary: 'x' })
})

test('mappings deeper than one level fall back to raw text', () => {
  const fm = extractFrontmatter('---\nouter:\n  inner:\n    deep: x\n---\nBody\n')
  expect(typeof fm?.data.outer).toBe('string')
})

test('extractFrontmatter handles empty frontmatter and comments', () => {
  expect(extractFrontmatter('---\n---\n# Body\n')?.data).toEqual({})
  const fm = extractFrontmatter('---\n# a comment\ntitle: x\n---\n')
  expect(fm?.data).toEqual({ title: 'x' })
})
