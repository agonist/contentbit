import { genericBlocks, genericMarkdownRenderers } from '@content-blocks/blocks'
import {
  createBlockRegistry,
  parseDocument,
  renderToMarkdown,
  validateDocument,
} from '@content-blocks/core'
import { expect, test } from 'vitest'

import { renderToHtml } from './render.js'

const FIXTURE = `# Pizza dough, three ways

Some intro prose.

:::callout{type="tldr"}
65% hydration, 24h cold ferment, 250g balls.
:::

:::key-metrics
- 65% | Hydration
- 24h | Cold ferment
:::

:::comparison{left="Fresh yeast" right="Instant"}
- Amount | 9g | 3g
- Availability | Bakeries | Everywhere
:::

:::tabs
::tab{title="Stand Mixer"}
Hook, speed 2, 8 minutes.
::tab{title="By Hand"}
Fold every 30 minutes, 4 times.
:::

:::faq
::faq-item{question="Can I freeze the dough?"}
Yes — after balling, up to 3 months.
:::
`

test('the full fixture validates clean and renders through every target', () => {
  const registry = createBlockRegistry().use(genericBlocks())
  const result = validateDocument(parseDocument(FIXTURE), registry)
  expect(result.diagnostics).toEqual([])
  expect(result.ok).toBe(true)

  const html = renderToHtml(result.document)
  for (const text of [
    '65% hydration',
    'Hydration',
    'Fresh yeast',
    'Stand Mixer',
    'Can I freeze the dough?',
  ]) {
    expect(html).toContain(text)
  }

  const md = renderToMarkdown(result.document, { renderers: genericMarkdownRenderers })
  for (const text of [
    '65% hydration',
    '**65%**',
    '| Amount | 9g | 3g |',
    '### Stand Mixer',
    '**Q: Can I freeze the dough?**',
  ]) {
    expect(md).toContain(text)
  }
})
