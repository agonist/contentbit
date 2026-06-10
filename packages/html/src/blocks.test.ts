import { genericBlocks } from '@content-blocks/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@content-blocks/core'
import { expect, test } from 'vitest'

import { renderToHtml } from './render.js'

const registry = createBlockRegistry().use(genericBlocks())
const html = (src: string) => renderToHtml(validateDocument(parseDocument(src), registry).document)

test('steps renders an ordered list', () => {
  const out = html(':::steps\n1. Mix\n2. Rest\n:::\n')
  expect(out).toContain('<ol class="cb-steps">')
  expect(out).toContain('<li>Mix</li>')
})

test('key-metrics renders value/label pairs', () => {
  const out = html(':::key-metrics\n- 42% | Lift\n- 18ms | Parse\n:::\n')
  expect(out).toContain('class="cb-key-metrics"')
  expect(out).toContain('<span class="cb-key-metrics-value">42%</span>')
  expect(out).toContain('<span class="cb-key-metrics-label">Lift</span>')
})

test('comparison renders a table with scoped headers', () => {
  const out = html(
    ':::comparison{left="A" right="B"}\n- Speed | Fast | Slow\n- Cost | $ | $$\n:::\n',
  )
  expect(out).toContain('<table class="cb-comparison">')
  expect(out).toContain('<th scope="col">A</th>')
  expect(out).toContain('<td>Fast</td>')
})

test('tabs renders static sections (no hydration assumptions)', () => {
  const out = html(':::tabs\n::tab{title="X"}\nbody x\n::tab{title="Y"}\nbody y\n:::\n')
  expect(out).toContain('<section class="cb-tab">')
  expect(out).toContain('<h3 class="cb-tab-title">X</h3>')
  expect(out).not.toContain('<script')
})

test('faq renders details/summary so it works without JS', () => {
  const out = html(':::faq\n::faq-item{question="Freeze it?"}\nYes.\n:::\n')
  expect(out).toContain('<details')
  expect(out).toContain('<summary>Freeze it?</summary>')
})

test('user content is escaped everywhere', () => {
  const out = html(':::quick-ref\n- <img> | <script>\n- a | b\n:::\n')
  expect(out).not.toContain('<img>')
  expect(out).toContain('&lt;img&gt;')
})

test('renderer override replaces a default', () => {
  const { document } = validateDocument(parseDocument(':::steps\n1. a\n2. b\n:::\n'), registry)
  const out = renderToHtml(document, {
    renderers: { steps: () => '<custom-steps/>' },
  })
  expect(out).toBe('<custom-steps/>')
})
