import { expect, test } from 'vitest'
import { z } from 'zod'

import type { BlockNode } from './ast.js'

import { childBlocks, markdownBody, pipeRows } from './content-models.js'
import { parseDocument } from './parser.js'
import { createBlockRegistry, defineBlock } from './registry.js'
import { isValidatedBlock, isValidatedDocument, validateDocument } from './validate.js'

const calloutDef = defineBlock({
  name: 'callout',
  description: 'Callout box.',
  props: z.object({
    type: z.enum(['note', 'tip', 'warning']).default('note'),
    title: z.string().optional(),
  }),
  content: markdownBody(),
  authoring: { useWhen: ['x'], avoidWhen: ['y'], example: ':::callout\nz\n:::' },
})

const tabDef = defineBlock({
  name: 'tab',
  description: 'One tab.',
  props: z.object({ title: z.string().min(1) }),
  content: markdownBody(),
  childOnly: true,
  authoring: { useWhen: ['x'], avoidWhen: ['y'], example: '::tab{title="A"}' },
})

const tabsDef = defineBlock({
  name: 'tabs',
  description: 'Tab group.',
  content: childBlocks({ allowed: ['tab'], minChildren: 2 }),
  interactive: true,
  authoring: {
    useWhen: ['x'],
    avoidWhen: ['y'],
    example: ':::tabs\n::tab{title="A"}\nz\n:::',
  },
})

const registry = () => createBlockRegistry().use([calloutDef, tabDef, tabsDef])

test('valid document: ok=true, data and definition attached, defaults applied', () => {
  const parsed = parseDocument(':::callout{type="tip"}\nUse a scale.\n:::\n')
  expect(isValidatedDocument(parsed.document)).toBe(false)
  const result = validateDocument(parsed, registry())
  expect(result.ok).toBe(true)
  expect(result.diagnostics).toEqual([])
  expect(isValidatedDocument(result.document)).toBe(true)
  const block = result.document.children[0] as BlockNode
  expect(isValidatedBlock(block)).toBe(true)
  if (isValidatedBlock(block)) {
    expect(block.data).toEqual({ markdown: 'Use a scale.' })
    expect(block.definition.name).toBe('callout')
    expect(block.props).toEqual({ type: 'tip' })
  }
})

test('unknown block is an error by default, warning when configured', () => {
  const parsed = parseDocument(':::mystery\nhm\n:::\n')
  expect(validateDocument(parsed, registry()).ok).toBe(false)
  const lax = validateDocument(parsed, registry(), { unknownBlocks: 'warning' })
  expect(lax.ok).toBe(true)
  expect(lax.diagnostics[0].code).toBe('CB_UNKNOWN_BLOCK')
  expect(lax.diagnostics[0].hint).toContain('callout')
})

test('unknown block hints at the closest registered block', () => {
  const result = validateDocument(parseDocument(':::calluot\nhm\n:::\n'), registry())
  expect(result.ok).toBe(false)
  expect(result.diagnostics[0].code).toBe('CB_UNKNOWN_BLOCK')
  expect(result.diagnostics[0].hint).toContain('Did you mean "callout"?')
})

test('invalid props produce CB_PROPS_INVALID with the zod path', () => {
  const parsed = parseDocument(':::callout{type="shout"}\nbody\n:::\n')
  const result = validateDocument(parsed, registry())
  expect(result.ok).toBe(false)
  expect(result.diagnostics[0].code).toBe('CB_PROPS_INVALID')
  expect(result.diagnostics[0].message).toContain('type')
  expect(result.diagnostics[0].position.start.column).toBe(12)
})

test('unknown props produce CB_UNKNOWN_PROP with a did-you-mean hint', () => {
  const parsed = parseDocument(':::callout{titel="Heads up"}\nbody\n:::\n')
  const result = validateDocument(parsed, registry())
  expect(result.ok).toBe(false)
  expect(result.diagnostics[0].code).toBe('CB_UNKNOWN_PROP')
  expect(result.diagnostics[0].message).toContain('unknown prop "titel"')
  expect(result.diagnostics[0].hint).toContain('Did you mean "title"?')
  expect(result.diagnostics[0].position.start.column).toBe(12)
})

test('childOnly block at top level is rejected; nested children are validated', () => {
  const top = validateDocument(parseDocument('::tab{title="A"}\nx\n'), registry())
  // parser already warns CB_CHILD_OUTSIDE_BLOCK and treats it as text — no block at all
  expect(top.document.children[0].type).toBe('markdown')

  const nested = parseDocument(':::tabs\n::tab{title="A"}\nx\n::tab{title=""}\ny\n:::\n')
  const result = validateDocument(nested, registry())
  expect(result.ok).toBe(false)
  expect(result.diagnostics.some((d) => d.code === 'CB_PROPS_INVALID')).toBe(true)
})

test('childOnly used as a top-level container is CB_CHILD_ONLY', () => {
  const parsed = parseDocument(':::tab{title="A"}\nx\n:::\n')
  const result = validateDocument(parsed, registry())
  expect(result.diagnostics.some((d) => d.code === 'CB_CHILD_ONLY')).toBe(true)
  const block = result.document.children[0]
  expect(block.type).toBe('block')
  expect(isValidatedBlock(block as never)).toBe(false)
})

test('nesting depth limit', () => {
  // Depths: outer tabs=1, ::tab=2, inner tabs=3, inner ::tab=4
  const src = [
    '::::tabs',
    '::tab{title="A"}',
    ':::tabs',
    '::tab{title="B"}',
    'x',
    '::tab{title="C"}',
    'y',
    ':::',
    '::tab{title="Z"}',
    'z',
    '::::',
  ].join('\n')
  const result = validateDocument(parseDocument(src), registry(), { maxDepth: 4 })
  expect(result.diagnostics.some((d) => d.code === 'CB_NESTING_DEPTH')).toBe(false)
  const strict = validateDocument(parseDocument(src), registry(), { maxDepth: 2 })
  expect(strict.diagnostics.some((d) => d.code === 'CB_NESTING_DEPTH')).toBe(true)
})

test('disallowed URL protocols in markdown are flagged', () => {
  const parsed = parseDocument('See [x](javascript:alert(1)) and [ok](https://a.b).\n')
  const result = validateDocument(parsed, registry())
  expect(result.ok).toBe(false)
  expect(result.diagnostics).toHaveLength(1)
  expect(result.diagnostics[0].code).toBe('CB_URL_PROTOCOL')
})

test('rows blocks validate against pipe schema', () => {
  const comparison = defineBlock({
    name: 'comparison',
    description: 'Two options.',
    props: z.object({ left: z.string(), right: z.string() }),
    content: pipeRows({ columns: ['label', 'left', 'right'], minRows: 2 }),
    authoring: { useWhen: ['x'], avoidWhen: ['y'], example: '' },
  })
  const reg = createBlockRegistry().add(comparison)
  const good = validateDocument(
    parseDocument(
      ':::comparison{left="A" right="B"}\n- Speed | Fast | Slow\n- Cost | $ | $$\n:::\n',
    ),
    reg,
  )
  expect(good.ok).toBe(true)
  const bad = validateDocument(
    parseDocument(':::comparison{left="A" right="B"}\n- Speed | Fast\n- Cost | $ | $$\n:::\n'),
    reg,
  )
  expect(bad.ok).toBe(false)
  expect(bad.diagnostics[0].position.start.line).toBe(2)
})
