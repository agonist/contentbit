import {
  createBlockRegistry,
  parseDocument,
  renderToMarkdown,
  validateDocument,
} from '@content-blocks/core'
import { expect, test } from 'vitest'

import { comparisonBlock, comparisonMarkdown } from './comparison.js'
import { prosConsBlock, prosConsMarkdown, splitProsCons } from './pros-cons.js'

const registry = createBlockRegistry().use([comparisonBlock, prosConsBlock])
const renderers = { comparison: comparisonMarkdown, 'pros-cons': prosConsMarkdown }

test('comparison requires left/right props and 3-column rows; renders a table', () => {
  const src =
    ':::comparison{left="Basic" right="Pro"}\n- Price | Free | $12/mo\n- Support | Community | Priority\n:::\n'
  const result = validateDocument(parseDocument(src), registry)
  expect(result.ok).toBe(true)
  expect(renderToMarkdown(result.document, { renderers })).toBe(
    '| | Basic | Pro |\n|---|---|---|\n| Price | Free | $12/mo |\n| Support | Community | Priority |\n',
  )
  expect(
    validateDocument(parseDocument(':::comparison\n- a | b | c\n- d | e | f\n:::\n'), registry).ok,
  ).toBe(false)
})

test('comparison re-escapes literal pipes in cells when rendering markdown', () => {
  const src =
    ':::comparison{left="A" right="B"}\n- Price | Free \\| $0 | $12/mo\n- Cost | $ | $$\n:::\n'
  const result = validateDocument(parseDocument(src), registry)
  expect(result.ok).toBe(true)
  const md = renderToMarkdown(result.document, { renderers })
  expect(md).toContain('| Price | Free \\| $0 | $12/mo |')
})

test('pros-cons splits signed items and renders two lists', () => {
  const src = ':::pros-cons\n+ Cheap to run\n+ Fast setup\n- No offline mode\n:::\n'
  const result = validateDocument(parseDocument(src), registry)
  expect(result.ok).toBe(true)
  const block = result.document.children[0]
  if (block.type === 'block' && 'data' in block) {
    const { pros, cons } = splitProsCons(block.data as never)
    expect(pros).toEqual(['Cheap to run', 'Fast setup'])
    expect(cons).toEqual(['No offline mode'])
  }
  expect(renderToMarkdown(result.document, { renderers })).toBe(
    '**Pros**\n\n- Cheap to run\n- Fast setup\n\n**Cons**\n\n- No offline mode\n',
  )
})
