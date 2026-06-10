import { genericBlocks } from '@content-blocks/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@content-blocks/core'
import { expect, test } from 'vitest'

import { renderToHtml } from './render.js'

const registry = createBlockRegistry().use(genericBlocks())

function validated(src: string) {
  return validateDocument(parseDocument(src), registry)
}

test('markdown segments render through the default paragraph renderer, escaped', () => {
  const { document } = validated('Hello <b>there</b>\n')
  expect(renderToHtml(document)).toBe('<p>Hello &lt;b&gt;there&lt;/b&gt;</p>')
})

test('a custom renderMarkdown replaces the default', () => {
  const { document } = validated('**hi**\n')
  expect(renderToHtml(document, { renderMarkdown: (md) => `<md>${md.trim()}</md>` })).toBe(
    '<md>**hi**</md>',
  )
})

test('validated blocks dispatch to the generic html renderers with class prefix', () => {
  const { document } = validated(':::callout{type="tip" title="Scale"}\nWeigh your flour.\n:::\n')
  const html = renderToHtml(document)
  expect(html).toContain('class="cb-callout cb-callout-tip"')
  expect(html).toContain('<div class="cb-callout-title">Scale</div>')
  expect(html).toContain('Weigh your flour.')
})

test('classPrefix is configurable', () => {
  const { document } = validated(':::steps\n1. a\n2. b\n:::\n')
  expect(renderToHtml(document, { classPrefix: 'x-' })).toContain('class="x-steps"')
})

test('fallback mode renders invalid blocks as escaped body (default)', () => {
  const { document } = validated(':::mystery\n<oops>\n:::\n')
  const html = renderToHtml(document)
  expect(html).toContain('&lt;oops&gt;')
  expect(html).not.toContain('<oops>')
})

test('annotated mode marks invalid blocks for developers', () => {
  const { document } = validated(':::mystery\nx\n:::\n')
  const html = renderToHtml(document, { onInvalid: 'annotated' })
  expect(html).toContain('data-cb-invalid="mystery"')
})

test('strict mode throws on invalid blocks', () => {
  const { document } = validated(':::mystery\nx\n:::\n')
  expect(() => renderToHtml(document, { onInvalid: 'strict' })).toThrow(/mystery/)
})
