import { expect, test } from 'vitest'

import type { SourceRange } from './diagnostics.js'

import { parseProps } from './props.js'

const pos: SourceRange = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 40, offset: 39 },
}

test('parses quoted strings, numbers, booleans, bare identifiers', () => {
  const { props, diagnostics } = parseProps(
    '{title="Quick \\"Ref\\"" count=3 ratio=-1.5 featured=true variant=compact}',
    pos,
  )
  expect(diagnostics).toEqual([])
  expect(props).toEqual({
    title: 'Quick "Ref"',
    count: 3,
    ratio: -1.5,
    featured: true,
    variant: 'compact',
  })
})

test('bare key is boolean shorthand', () => {
  const { props } = parseProps('{featured}', pos)
  expect(props).toEqual({ featured: true })
})

test('null raw returns empty props', () => {
  expect(parseProps(null, pos)).toEqual({ props: {}, diagnostics: [] })
})

test('unterminated string reports CB_PROPS_SYNTAX', () => {
  const { diagnostics } = parseProps('{title="oops}', pos)
  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0].code).toBe('CB_PROPS_SYNTAX')
  expect(diagnostics[0].severity).toBe('error')
})

test('invalid value reports CB_PROPS_SYNTAX with hint', () => {
  const { diagnostics } = parseProps('{items=[1,2]}', pos)
  expect(diagnostics[0].code).toBe('CB_PROPS_SYNTAX')
  expect(diagnostics[0].hint).toContain('quoted strings')
})

test('missing closing brace reports CB_PROPS_SYNTAX and returns no props', () => {
  const { props, diagnostics } = parseProps('{type=tip', pos)
  expect(props).toEqual({})
  expect(diagnostics).toHaveLength(1)
  expect(diagnostics[0].code).toBe('CB_PROPS_SYNTAX')
  expect(diagnostics[0].message).toContain('closing')
})
