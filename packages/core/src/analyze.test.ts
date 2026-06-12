import { expect, test } from 'vitest'

import { analyzeDocument } from './analyze.js'

const plainDoc = [
  '# Title',
  '',
  'Intro paragraph with five words.',
  '',
  '## Section A',
  '',
  'Some text [a link](https://github.com/x) here.',
  '![logo](/img/logo.png)',
  '![](missing.png)',
  '',
  '- item one',
  '- item two',
  '',
  '## Section B',
  '',
  '> quoted line',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  '```ts',
  'const x = 1',
  '```',
  '',
  'Done.',
  '',
].join('\n')

test('outline lists headings with lines and per-section word counts', () => {
  const stats = analyzeDocument(plainDoc)
  expect(stats.outline).toEqual([
    { level: 1, text: 'Title', line: 1, words: 6 },
    { level: 2, text: 'Section A', line: 5, words: 11 },
    { level: 2, text: 'Section B', line: 14, words: 9 },
  ])
})

test('counts prose words, excluding code and markup syntax', () => {
  const stats = analyzeDocument(plainDoc)
  expect(stats.length.words).toBe(26)
  expect(stats.length.characters).toBe(plainDoc.length)
  expect(stats.length.readingMinutes).toBe(1)
  expect(stats.length.approxTokens).toBe(Math.ceil(plainDoc.length / 4))
})

test('reports file size and line count', () => {
  const stats = analyzeDocument(plainDoc, { path: 'docs/x.md' })
  expect(stats.file).toEqual({ path: 'docs/x.md', bytes: plainDoc.length, lines: 26 })
  expect(analyzeDocument(plainDoc).file.path).toBeNull()
})

test('extracts links with line numbers and external/internal split', () => {
  const stats = analyzeDocument(plainDoc)
  expect(stats.links).toEqual({
    total: 1,
    external: 1,
    internal: 0,
    domains: ['github.com'],
    items: [{ url: 'https://github.com/x', text: 'a link', line: 7, external: true }],
  })
})

test('counts images and missing alt text', () => {
  expect(analyzeDocument(plainDoc).images).toEqual({ total: 2, missingAlt: 1 })
})

test('counts code fences, languages, and structure', () => {
  const stats = analyzeDocument(plainDoc)
  expect(stats.code).toEqual({ fences: 1, languages: ['ts'], inlineSpans: 0 })
  expect(stats.structure).toEqual({ listItems: 2, tables: 1, blockquotes: 1 })
})

test('no blocks in plain markdown', () => {
  expect(analyzeDocument(plainDoc).blocks).toEqual({
    total: 0,
    byName: {},
    maxDepth: 0,
    instances: [],
  })
})

const blocksDoc = [
  '# Doc',
  '',
  ':::callout{type="info"}',
  'Callout body words here.',
  '',
  '::step',
  'Inner step text.',
  ':::',
  '',
  'Outro.',
  '',
].join('\n')

test('block census with nesting depth and instance lines', () => {
  const stats = analyzeDocument(blocksDoc)
  expect(stats.blocks).toEqual({
    total: 2,
    byName: { callout: 1, step: 1 },
    maxDepth: 2,
    instances: [
      { name: 'callout', line: 3, depth: 1 },
      { name: 'step', line: 6, depth: 2 },
    ],
  })
})

test('words inside block bodies count toward totals and sections', () => {
  const stats = analyzeDocument(blocksDoc)
  expect(stats.length.words).toBe(9)
  expect(stats.outline).toEqual([{ level: 1, text: 'Doc', line: 1, words: 9 }])
})

const fmDoc = [
  '---',
  'title: Hello',
  'tags: [a, b]',
  '---',
  '',
  '# Hi',
  '',
  'One two three.',
  '',
].join('\n')

test('frontmatter is parsed and excluded from word counts', () => {
  const stats = analyzeDocument(fmDoc)
  expect(stats.frontmatter).toEqual({
    present: true,
    keys: ['title', 'tags'],
    data: { title: 'Hello', tags: ['a', 'b'] },
    lines: { start: 1, end: 4 },
  })
  expect(stats.length.words).toBe(4)
  expect(stats.outline).toEqual([{ level: 1, text: 'Hi', line: 6, words: 4 }])
})

const fenceDoc = [
  'Before.',
  '',
  '```md',
  '# not a heading',
  '[not a link](x)',
  '```',
  '',
  'Use `inline code` and `more`.',
  '',
].join('\n')

test('code fences are opaque to headings, links, and words', () => {
  const stats = analyzeDocument(fenceDoc)
  expect(stats.outline).toEqual([])
  expect(stats.links.total).toBe(0)
  expect(stats.length.words).toBe(3)
  expect(stats.code).toEqual({ fences: 1, languages: ['md'], inlineSpans: 2 })
})

test('empty source yields empty stats', () => {
  const stats = analyzeDocument('')
  expect(stats.file).toEqual({ path: null, bytes: 0, lines: 0 })
  expect(stats.frontmatter).toEqual({ present: false, keys: [], data: {}, lines: null })
  expect(stats.length).toEqual({ words: 0, characters: 0, readingMinutes: 0, approxTokens: 0 })
  expect(stats.outline).toEqual([])
  expect(stats.blocks.total).toBe(0)
})
