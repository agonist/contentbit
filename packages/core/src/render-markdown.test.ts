import { expect, test } from 'vitest'
import { z } from 'zod'

import { markdownBody } from './content-models.js'
import { parseDocument } from './parser.js'
import { createBlockRegistry, defineBlock } from './registry.js'
import { renderToMarkdown, type MarkdownBlockRenderer } from './render-markdown.js'
import { validateDocument } from './validate.js'

const callout = defineBlock({
  name: 'callout',
  description: 'Callout.',
  props: z.object({ type: z.string().default('note'), title: z.string().optional() }),
  content: markdownBody(),
  authoring: { useWhen: [], avoidWhen: [], example: '' },
})

const calloutMd: MarkdownBlockRenderer = (node) => {
  const data = node.data as { markdown: string }
  const title = (node.props.title as string | undefined) ?? (node.props.type as string)
  return `> **${title}:** ${data.markdown}`
}

test('markdown passes through; validated blocks use their renderer', () => {
  const parsed = parseDocument('before\n\n:::callout{type="tip"}\nWeigh it.\n:::\n\nafter\n')
  const { document } = validateDocument(parsed, createBlockRegistry().add(callout))
  const out = renderToMarkdown(document, { renderers: { callout: calloutMd } })
  expect(out).toBe('before\n\n> **tip:** Weigh it.\n\nafter\n')
})

test('blocks without a renderer fall back to their raw body', () => {
  const parsed = parseDocument(':::callout\nJust the body.\n:::\n')
  const { document } = validateDocument(parsed, createBlockRegistry().add(callout))
  expect(renderToMarkdown(document)).toBe('Just the body.\n')
})
