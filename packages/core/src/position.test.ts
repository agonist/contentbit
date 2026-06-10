import { expect, test } from 'vitest'

import type { BlockNode } from './ast.js'

import { parseDocument } from './parser.js'
import { bodyLineRange } from './position.js'

test('bodyLineRange maps a body line index to document coordinates', () => {
  const src = 'intro\n:::key-metrics\n- 42% | Lift\n- 18ms | Parse\n:::\n'
  const { document } = parseDocument(src)
  const block = document.children[1] as BlockNode
  const range = bodyLineRange(block, 1) // "- 18ms | Parse"
  expect(range.start.line).toBe(4)
  expect(range.start.column).toBe(1)
  expect(src.slice(range.start.offset, range.end.offset)).toBe('- 18ms | Parse')
})
