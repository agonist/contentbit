import { expect, test } from 'vitest'

import type { BlockNode, MarkdownNode } from './ast.js'

import { parseDocument } from './parser.js'

test('plain markdown becomes a single markdown node', () => {
  const { document, diagnostics } = parseDocument('# Hello\n\nSome *prose*.\n')
  expect(diagnostics).toEqual([])
  expect(document.children).toHaveLength(1)
  const md = document.children[0] as MarkdownNode
  expect(md.type).toBe('markdown')
  expect(md.value).toBe('# Hello\n\nSome *prose*.\n')
  expect(md.position.start).toEqual({ line: 1, column: 1, offset: 0 })
})

test('container block with props, body, and positions', () => {
  const src = [
    'intro',
    '',
    ':::callout{type="tip" title="Hey"}',
    'Use a **scale**.',
    ':::',
    'outro',
  ].join('\n')
  const { document, diagnostics } = parseDocument(src)
  expect(diagnostics).toEqual([])
  expect(document.children.map((n) => n.type)).toEqual(['markdown', 'block', 'markdown'])
  const block = document.children[1] as BlockNode
  expect(block.name).toBe('callout')
  expect(block.fence).toBe(3)
  expect(block.props).toEqual({ type: 'tip', title: 'Hey' })
  expect(block.body).toBe('Use a **scale**.')
  expect(block.openPosition.start.line).toBe(3)
  expect(block.closePosition?.start.line).toBe(5)
  expect(block.position.start.line).toBe(3)
  expect(block.position.end.line).toBe(5)
  expect(block.children).toHaveLength(1)
  expect((block.children[0] as MarkdownNode).value).toBe('Use a **scale**.')
})

test('props syntax errors surface as diagnostics tagged with the block name', () => {
  const { diagnostics } = parseDocument(':::callout{title="oops}\nbody\n:::\n')
  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0].code).toBe('CB_PROPS_SYNTAX')
  expect(diagnostics[0].blockName).toBe('callout')
})

test('child blocks close implicitly at next sibling and at parent close', () => {
  const src = [
    ':::tabs',
    '::tab{title="Fast"}',
    'Use this when time matters.',
    '::tab{title="Cheap"}',
    'Use this when budget matters.',
    ':::',
  ].join('\n')
  const { document, diagnostics } = parseDocument(src)
  expect(diagnostics).toEqual([])
  const tabs = document.children[0] as BlockNode
  expect(tabs.name).toBe('tabs')
  expect(tabs.children).toHaveLength(2)
  const [a, b] = tabs.children as BlockNode[]
  expect(a.name).toBe('tab')
  expect(a.fence).toBe(2)
  expect(a.props).toEqual({ title: 'Fast' })
  expect(a.body).toBe('Use this when time matters.')
  expect(a.closePosition).toBeNull()
  expect(b.props).toEqual({ title: 'Cheap' })
  expect(b.body).toBe('Use this when budget matters.')
})

test('three-colon blocks nest inside child bodies and close innermost-first', () => {
  const src = [
    '::::tabs',
    '::tab{title="A"}',
    'before',
    ':::callout{type="tip"}',
    'inner',
    ':::',
    'after',
    '::::',
  ].join('\n')
  const { document, diagnostics } = parseDocument(src)
  expect(diagnostics).toEqual([])
  const tabs = document.children[0] as BlockNode
  expect(tabs.fence).toBe(4)
  const tab = tabs.children[0] as BlockNode
  expect(tab.children.map((n) => n.type)).toEqual(['markdown', 'block', 'markdown'])
  expect((tab.children[1] as BlockNode).name).toBe('callout')
  expect((tab.children[1] as BlockNode).body).toBe('inner')
})

test('parent body includes raw child source', () => {
  const src = [':::tabs', '::tab{title="A"}', 'x', ':::'].join('\n')
  const { document } = parseDocument(src)
  const tabs = document.children[0] as BlockNode
  expect(tabs.body).toBe('::tab{title="A"}\nx')
})

test('child block at top level is plain text plus a warning', () => {
  const { document, diagnostics } = parseDocument('::tab{title="A"}\nbody\n')
  expect(diagnostics[0].code).toBe('CB_CHILD_OUTSIDE_BLOCK')
  expect(document.children[0].type).toBe('markdown')
})

test('::: inside a code fence is literal text', () => {
  const src = ['```md', ':::callout', ':::', '```', ''].join('\n')
  const { document, diagnostics } = parseDocument(src)
  expect(diagnostics).toEqual([])
  expect(document.children).toHaveLength(1)
  expect(document.children[0].type).toBe('markdown')
})

test('code fence inside a block body stays opaque', () => {
  const src = [':::callout', '```', '::: not a close', '```', 'real body', ':::'].join('\n')
  const { document, diagnostics } = parseDocument(src)
  expect(diagnostics).toEqual([])
  const block = document.children[0] as BlockNode
  expect(block.body).toContain('::: not a close')
  expect(block.closePosition?.start.line).toBe(6)
})

test('unclosed container reports CB_UNCLOSED_BLOCK at the open line', () => {
  const { diagnostics, document } = parseDocument(':::steps\n1. one\n')
  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0].code).toBe('CB_UNCLOSED_BLOCK')
  expect(diagnostics[0].severity).toBe('error')
  expect(diagnostics[0].position.start.line).toBe(1)
  expect((document.children[0] as BlockNode).body).toBe('1. one\n')
})

test('fence length mismatch closes innermost with a warning', () => {
  const { diagnostics, document } = parseDocument('::::tabs\nbody\n:::\n')
  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0].code).toBe('CB_FENCE_MISMATCH')
  expect((document.children[0] as BlockNode).closePosition?.start.line).toBe(3)
})

test('stray close fence is a warning and literal text', () => {
  const { diagnostics } = parseDocument('hello\n:::\nworld\n')
  expect(diagnostics[0].code).toBe('CB_UNMATCHED_CLOSE')
})

test('multiple errors are all reported (recovery)', () => {
  const src = [':::callout{bad="x', 'body', ':::', ':::steps', '1. one'].join('\n')
  const { diagnostics } = parseDocument(src)
  const codes = diagnostics.map((d) => d.code).sort()
  expect(codes).toEqual(['CB_PROPS_SYNTAX', 'CB_UNCLOSED_BLOCK'])
})
