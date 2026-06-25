import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { expect, test } from 'vitest'

import ContentBlocks from '../components/ContentBlocks.astro'

const FIXTURE = `# Pizza dough, three ways

Some intro prose.

:::callout{type="tldr"}
65% hydration, 24h cold ferment, 250g balls.
:::

:::steps
1. Mix
2. Rest
:::

:::key-metrics
- 65% | Hydration
- 24h | Cold ferment
:::

:::quick-ref
- Hydration | 65%
- Yeast | 3g instant
:::

:::comparison{left="Fresh yeast" right="Instant"}
- Amount | 9g | 3g
- Availability | Bakeries | Everywhere
:::

:::pros-cons
+ Cheap to run
+ Fast setup
- No offline mode
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

const norm = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim()

test('default Astro output renders the full generic pack without depending on html', async () => {
  const registry = createBlockRegistry().use(genericBlocks())
  const result = validateDocument(parseDocument(FIXTURE), registry)
  expect(result.diagnostics).toEqual([])

  const container = await AstroContainer.create()
  const astro = await container.renderToString(ContentBlocks, {
    props: { document: result.document },
  })

  const out = norm(astro)
  for (const expected of [
    'class="cb-callout cb-callout-tldr"',
    'class="cb-steps"',
    'class="cb-key-metrics"',
    'class="cb-quick-ref"',
    'class="cb-comparison"',
    'class="cb-pros-cons"',
    'class="cb-tabs"',
    'class="cb-faq"',
  ]) {
    expect(out).toContain(expected)
  }
})
