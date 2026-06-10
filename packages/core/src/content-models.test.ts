import { expect, test } from 'vitest'

import type { BlockNode } from './ast.js'
import type { Diagnostic } from './diagnostics.js'

import { childBlocks, listItems, markdownBody, pipeRows } from './content-models.js'
import { parseDocument } from './parser.js'

function firstBlock(src: string): BlockNode {
  const { document } = parseDocument(src)
  return document.children.find((n) => n.type === 'block') as BlockNode
}

function collect(): { report: (d: Diagnostic) => void; diags: Diagnostic[] } {
  const diags: Diagnostic[] = []
  return { report: (d) => diags.push(d), diags }
}

test('markdownBody returns trimmed body and flags empty bodies', () => {
  const { report, diags } = collect()
  const node = firstBlock(':::callout\n  hello **world**  \n:::')
  expect(markdownBody().parse(node, report)).toEqual({ markdown: 'hello **world**' })
  expect(diags).toEqual([])

  const empty = firstBlock(':::callout\n\n:::')
  markdownBody().parse(empty, report)
  expect(diags[0].code).toBe('CB_BODY_EMPTY')
})

test('pipeRows parses rows keyed by column, with escaped pipes', () => {
  const { report, diags } = collect()
  const node = firstBlock(':::comparison\n- Price | Free | $12/mo\n- Pipes | a \\| b | c\n:::')
  const data = pipeRows({ columns: ['label', 'left', 'right'], minRows: 2 }).parse(node, report)
  expect(diags).toEqual([])
  expect(data.rows).toEqual([
    { label: 'Price', left: 'Free', right: '$12/mo' },
    { label: 'Pipes', left: 'a | b', right: 'c' },
  ])
})

test('pipeRows reports wrong column count with the exact row line', () => {
  const { report, diags } = collect()
  const node = firstBlock(':::comparison\n- Price | Free | $12/mo\n- Broken | only-two\n:::')
  pipeRows({ columns: ['label', 'left', 'right'] }).parse(node, report)
  expect(diags).toHaveLength(1)
  expect(diags[0].code).toBe('CB_ROW_COLUMNS')
  expect(diags[0].position.start.line).toBe(3)
  expect(diags[0].message).toContain('3 columns')
})

test('pipeRows enforces minRows/maxRows and supports trailing optional columns', () => {
  const { report, diags } = collect()
  const node = firstBlock(':::ingredients\n- 500g | Flour | sifted\n- 300g | Water\n:::')
  const data = pipeRows({ columns: ['qty', 'name', 'note'], optionalColumns: 1 }).parse(
    node,
    report,
  )
  expect(diags).toEqual([])
  expect(data.rows[1]).toEqual({ qty: '300g', name: 'Water', note: '' })

  const { report: r2, diags: d2 } = collect()
  pipeRows({ columns: ['a', 'b'], minRows: 3 }).parse(firstBlock(':::x\n- 1 | 2\n:::'), r2)
  expect(d2[0].code).toBe('CB_ROW_COUNT')
})

test('listItems parses ordered, bullet, and signed markers', () => {
  const { report, diags } = collect()
  const ordered = listItems({ marker: 'ordered', minItems: 2 }).parse(
    firstBlock(':::steps\n1. Mix\n2. Rest\n:::'),
    report,
  )
  expect(ordered.items).toEqual([{ text: 'Mix' }, { text: 'Rest' }])

  const signed = listItems({ marker: 'signed' }).parse(
    firstBlock(':::pros-cons\n+ Cheap\n- Slow\n:::'),
    report,
  )
  expect(signed.items).toEqual([
    { text: 'Cheap', sign: '+' },
    { text: 'Slow', sign: '-' },
  ])
  expect(diags).toEqual([])

  const { report: r2, diags: d2 } = collect()
  listItems({ marker: 'ordered', minItems: 3 }).parse(firstBlock(':::steps\n1. Only\n:::'), r2)
  expect(d2[0].code).toBe('CB_ITEM_COUNT')
})

test('childBlocks validates allowed names and child count', () => {
  const { report, diags } = collect()
  const node = firstBlock(':::tabs\n::tab{title="A"}\nx\n::tab{title="B"}\ny\n:::')
  const data = childBlocks({ allowed: ['tab'], minChildren: 2 }).parse(node, report)
  expect(diags).toEqual([])
  expect(data.blocks.map((b) => b.name)).toEqual(['tab', 'tab'])

  const { report: r2, diags: d2 } = collect()
  const bad = firstBlock(':::tabs\n::oops{title="A"}\nx\n:::')
  childBlocks({ allowed: ['tab'], minChildren: 2 }).parse(bad, r2)
  const codes = d2.map((d) => d.code).sort()
  expect(codes).toEqual(['CB_CHILD_COUNT', 'CB_CHILD_NOT_ALLOWED'])
})
