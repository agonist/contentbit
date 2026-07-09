import { expect, test } from 'vitest'
import { z } from 'zod'

import { assertValidDocument } from './compile.js'
import { markdownBody } from './content-models.js'
import { parseDocument } from './parser.js'
import { createBlockRegistry, defineBlock } from './registry.js'
import {
  defineMarkdownBlockRenderer,
  defineMarkdownRenderers,
  renderToMarkdown,
} from './render-markdown.js'
import { validateDocument } from './validate.js'

const callout = defineBlock({
  name: 'callout',
  description: 'Callout.',
  props: z.object({ type: z.string().default('note'), title: z.string().optional() }),
  content: markdownBody(),
  authoring: { useWhen: [], avoidWhen: [], example: '' },
})

const calloutMd = defineMarkdownBlockRenderer(callout, (node) => {
  const data = node.data
  const title = node.props.title ?? node.props.type
  return `> **${title}:** ${data.markdown}`
})

test('markdown passes through; validated blocks use their renderer', () => {
  const parsed = parseDocument('before\n\n:::callout{type="tip"}\nWeigh it.\n:::\n\nafter\n')
  const document = assertValidDocument(validateDocument(parsed, createBlockRegistry().add(callout)))
  const renderers = defineMarkdownRenderers([callout], { callout: calloutMd })
  const out = renderToMarkdown(document, { renderers })
  expect(out).toBe('before\n\n> **tip:** Weigh it.\n\nafter\n')
})

test('blocks without a renderer fall back to their raw body', () => {
  const parsed = parseDocument(':::callout\nJust the body.\n:::\n')
  const document = assertValidDocument(validateDocument(parsed, createBlockRegistry().add(callout)))
  expect(renderToMarkdown(document)).toBe('Just the body.\n')
})
