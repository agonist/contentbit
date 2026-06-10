import {
  createBlockRegistry,
  parseDocument,
  renderToMarkdown,
  validateDocument,
} from '@content-blocks/core'
import { expect, test } from 'vitest'

import { calloutBlock, calloutMarkdown } from './callout.js'
import { keyMetricsBlock, keyMetricsMarkdown } from './key-metrics.js'
import { quickRefBlock, quickRefMarkdown } from './quick-ref.js'
import { stepsBlock, stepsMarkdown } from './steps.js'

const registry = createBlockRegistry().use([
  calloutBlock,
  stepsBlock,
  keyMetricsBlock,
  quickRefBlock,
])
const renderers = {
  callout: calloutMarkdown,
  steps: stepsMarkdown,
  'key-metrics': keyMetricsMarkdown,
  'quick-ref': quickRefMarkdown,
}

function validate(src: string) {
  return validateDocument(parseDocument(src), registry)
}

test('callout validates type enum and renders blockquote fallback', () => {
  const ok = validate(':::callout{type="tip" title="Scale"}\nWeigh your flour.\n:::\n')
  expect(ok.ok).toBe(true)
  expect(renderToMarkdown(ok.document, { renderers })).toBe('> **Scale:** Weigh your flour.\n')

  const bad = validate(':::callout{type="shout"}\nhi\n:::\n')
  expect(bad.ok).toBe(false)
})

test('steps requires 2+ ordered items and renders a numbered list', () => {
  const ok = validate(':::steps\n1. Mix the dough\n2. Rest 20 minutes\n:::\n')
  expect(ok.ok).toBe(true)
  expect(renderToMarkdown(ok.document, { renderers })).toBe(
    '1. Mix the dough\n2. Rest 20 minutes\n',
  )

  expect(validate(':::steps\n1. Only one\n:::\n').ok).toBe(false)
})

test('key-metrics parses value|label rows and renders bold-value bullets', () => {
  const ok = validate(':::key-metrics\n- 42% | Conversion lift\n- 18ms | Median parse time\n:::\n')
  expect(ok.ok).toBe(true)
  expect(renderToMarkdown(ok.document, { renderers })).toBe(
    '- **42%** — Conversion lift\n- **18ms** — Median parse time\n',
  )
})

test('quick-ref parses key|value rows and renders definition bullets', () => {
  const ok = validate(':::quick-ref\n- Hydration | 65%\n- Proof time | 2h\n:::\n')
  expect(ok.ok).toBe(true)
  expect(renderToMarkdown(ok.document, { renderers })).toBe(
    '- **Hydration:** 65%\n- **Proof time:** 2h\n',
  )
})
