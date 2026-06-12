import type { ValidatedBlockNode } from '@contentbit/core'

import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { genericHtmlRenderers } from '@contentbit/html'
import { expect, test } from 'vitest'

import { renderBlockShell } from './render-block.js'

const registry = createBlockRegistry().use(genericBlocks())

function block(source: string): ValidatedBlockNode<unknown> {
  const result = validateDocument(parseDocument(source), registry)
  return result.document.children[0] as ValidatedBlockNode<unknown>
}

const opts = {
  classPrefix: 'cb-',
  renderMarkdown: (md: string) => `<p>${md.trim()}</p>`,
  renderers: genericHtmlRenderers,
}

test('a renderer that never calls renderNodes yields a single part', () => {
  const node = block(':::steps\n1. Mix\n2. Rest\n:::\n')
  const shell = renderBlockShell(node, opts)
  expect(shell).not.toBeNull()
  expect(shell!.childSlots).toEqual([])
  expect(shell!.parts).toHaveLength(1)
  expect(shell!.parts[0]).toContain('<ol class="cb-steps">')
  expect(shell!.parts[0]).toContain('<li>Mix</li>')
})

test('renderNodes call sites become child slots between parts', () => {
  const node = block(':::callout{type="tip"}\nHello\n:::\n')
  const shell = renderBlockShell(node, {
    ...opts,
    renderers: {
      callout: (n, ctx) =>
        `<aside class="${ctx.cls('callout')}">${ctx.renderNodes(n.children)}</aside>`,
    },
  })
  expect(shell!.parts).toEqual(['<aside class="cb-callout">', '</aside>'])
  expect(shell!.childSlots).toHaveLength(1)
  expect(shell!.childSlots[0][0]).toMatchObject({ type: 'markdown' })
})

test('multiple renderNodes calls keep document order', () => {
  const node = block(':::callout{type="tip"}\nHello\n:::\n')
  const shell = renderBlockShell(node, {
    ...opts,
    renderers: {
      callout: (n, ctx) =>
        `<a>${ctx.renderNodes(n.children)}</a><b>${ctx.renderNodes(n.children)}</b>`,
    },
  })
  expect(shell!.parts).toEqual(['<a>', '</a><b>', '</b>'])
  expect(shell!.childSlots).toHaveLength(2)
})

test('a token-looking sequence in real content is left as literal text', () => {
  const node = block(':::callout{type="tip"}\nHello\n:::\n')
  const shell = renderBlockShell(node, {
    ...opts,
    renderers: {
      callout: () => 'before \u0000cb:9\u0000 after',
    },
  })
  expect(shell!.parts).toEqual(['before \u0000cb:9\u0000 after'])
  expect(shell!.childSlots).toEqual([])
})

test('returns null when no renderer is registered for the block', () => {
  const node = block(':::callout{type="tip"}\nHello\n:::\n')
  expect(renderBlockShell(node, { ...opts, renderers: {} })).toBeNull()
})
