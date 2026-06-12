import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  defineBlock,
  childBlocks,
  parseDocument,
  validateDocument,
  type DocumentNode,
} from '@contentbit/core'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { expect, test } from 'vitest'

import ContentBlocks from '../components/ContentBlocks.astro'
import FancyCallout from '../test-fixtures/FancyCallout.astro'

const boxBlock = defineBlock({
  name: 'box',
  description: 'A wrapper holding callouts.',
  content: childBlocks({ allowed: ['callout'] }),
  authoring: {
    useWhen: ['testing'],
    avoidWhen: [],
    example: ':::box\n::callout{type="tip"}\nx\n::\n:::',
  },
})

const registry = createBlockRegistry().use(genericBlocks()).use([boxBlock])

function doc(source: string): DocumentNode {
  return validateDocument(parseDocument(source), registry).document
}

async function render(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create()
  return container.renderToString(ContentBlocks, { props })
}

test('renders markdown prose through marked by default', async () => {
  const out = await render({ document: doc('# Hi\n\nHello *world*.\n') })
  expect(out).toContain('<h1>Hi</h1>')
  expect(out).toContain('<em>world</em>')
})

test('renders default blocks with cb- classes via the html renderers', async () => {
  const out = await render({ document: doc(':::callout{type="tip" title="Hey"}\nBody.\n:::\n') })
  expect(out).toContain('cb-callout')
  expect(out).toContain('cb-callout-tip')
  expect(out).toContain('cb-callout-title')
  expect(out).toContain('Body.')
})

test('classPrefix changes every class', async () => {
  const out = await render({
    document: doc(':::steps\n1. One\n2. Two\n:::\n'),
    classPrefix: 'x-',
  })
  expect(out).toContain('x-steps')
  expect(out).not.toContain('cb-steps')
})

test('a components override replaces the default and receives props + slot', async () => {
  const out = await render({
    document: doc(':::callout{type="tip" title="Hey"}\nBody.\n:::\n'),
    components: { callout: FancyCallout },
  })
  expect(out).toContain('class="fancy"')
  expect(out).toContain('data-type="tip"')
  expect(out).toContain('<strong>Hey</strong>')
  expect(out).toContain('Body.') // nested markdown rendered into the slot
  expect(out).toContain('data-block="callout"') // the reserved node prop carries the block node
  expect(out).not.toContain('cb-callout')
})

test('overrides apply inside custom string renderers via renderNodes (shell)', async () => {
  const source = ':::box\n::callout{type="tip" title="In"}\nNested.\n::\n:::\n'
  const out = await render({
    document: doc(source),
    components: { callout: FancyCallout },
    renderers: {
      box: (node: { data: { blocks: never[] } }, ctx: { renderNodes(n: never[]): string }) =>
        `<div class="box">${ctx.renderNodes(node.data.blocks)}</div>`,
    },
  })
  expect(out).toContain('class="box"')
  expect(out).toContain('class="fancy"') // override applied inside the shell
})

test('invalid blocks render as annotated boxes by default', async () => {
  const out = await render({ document: doc(':::callout{type="bogus"}\nx\n:::\n') })
  expect(out).toContain('data-cb-invalid="callout"')
  expect(out).toContain('<pre>')
})

test('onInvalid="strict" throws', async () => {
  await expect(
    render({ document: doc(':::callout{type="bogus"}\nx\n:::\n'), onInvalid: 'strict' }),
  ).rejects.toThrow(/callout/)
})

test('onInvalid="fallback" renders the escaped body as prose', async () => {
  const out = await render({
    document: doc(':::callout{type="bogus"}\n<b>x</b>\n:::\n'),
    onInvalid: 'fallback',
  })
  expect(out).not.toContain('data-cb-invalid')
  expect(out).toContain('&lt;b&gt;x&lt;/b&gt;')
})

test('renderMarkdown prop overrides the default pipeline', async () => {
  const out = await render({
    document: doc('Prose.\n'),
    renderMarkdown: (md: string) => `<custom>${md.trim()}</custom>`,
  })
  expect(out).toContain('<custom>Prose.</custom>')
})
