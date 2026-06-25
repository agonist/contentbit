import { expect, test } from 'vitest'
import { z } from 'zod'

import { markdownBody } from './content-models.js'
import { createBlockRegistry, defineBlock } from './registry.js'
import { scanContentProject } from './project-scan.js'

const callout = defineBlock({
  name: 'callout',
  description: 'Callout.',
  props: z.object({ type: z.enum(['tip', 'note']).default('note') }),
  content: markdownBody({ minLength: 10 }),
  authoring: { useWhen: [], avoidWhen: [], example: '' },
})

const registry = () => createBlockRegistry().add(callout)

test('scanContentProject returns validation, stats, and ranked findings', () => {
  const scan = scanContentProject(
    [
      {
        path: 'a.md',
        source: `---
slug: alpha
linksTo:
  - missing
---

# Tiny

Short.

![](/hero.png)

:::callout{type="surprise"}
Too short.
:::
`,
      },
    ],
    registry(),
  )

  expect(scan.summary).toEqual({ errors: 2, warnings: 1, suggestions: 2 })
  expect(scan.linkGraph).toMatchObject({ pages: 1, links: 1, orphans: 1 })
  expect(scan.files[0].frontmatter).toMatchObject({ slug: 'alpha' })
  expect(scan.files[0].stats.blocks.byName).toEqual({ callout: 1 })
  expect(scan.findings.map((finding) => finding.code)).toEqual([
    'CB_PROPS_INVALID',
    'CB_LINK_UNRESOLVED',
    'CB_LINK_ORPHAN',
    'CB_THIN_SECTION',
    'CB_IMAGE_ALT_MISSING',
  ])
})

test('scanContentProject can omit stats findings for validation-only adapters', () => {
  const scan = scanContentProject([{ path: 'thin.md', source: '# Tiny\n\nShort.\n' }], registry(), {
    includeStatsFindings: false,
  })

  expect(scan.summary).toEqual({ errors: 0, warnings: 0, suggestions: 0 })
  expect(scan.findings).toEqual([])
  expect(scan.files[0].stats.outline[0]).toMatchObject({ text: 'Tiny' })
})
