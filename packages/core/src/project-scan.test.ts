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

test('scanContentProject finds page-integrity problems across documents', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/alpha.md',
        source: `---
slug: alpha
title: Alpha guide
description: The alpha guide.
---

# Alpha

### Skipped level

[Missing page](./missing.md)
[Missing section](#does-not-exist)
`,
      },
      {
        path: '/content/beta.md',
        source: `---
slug: beta
title: Alpha Guide
description: the alpha guide.
---

## Beta

[Missing target section](./alpha.md#also-missing)
`,
      },
    ],
    registry(),
  )

  expect(scan.summary).toEqual({ errors: 0, warnings: 9, suggestions: 3 })
  expect(scan.findings.map((finding) => finding.code)).toEqual(
    expect.arrayContaining([
      'CB_HEADING_LEVEL_SKIPPED',
      'CB_MARKDOWN_LINK_UNRESOLVED',
      'CB_MARKDOWN_ANCHOR_UNRESOLVED',
      'CB_TITLE_DUPLICATE',
      'CB_DESCRIPTION_DUPLICATE',
      'CB_H1_MISSING',
    ]),
  )
  expect(scan.findings.find((finding) => finding.code === 'CB_TITLE_DUPLICATE')).toMatchObject({
    file: '/content/beta.md',
    line: 1,
    severity: 'warning',
  })
})

test('scanContentProject checks route links, multiple H1s, and locale/key parity', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/en.md',
        source: `---
slug: shared-en
key: shared
locale: en
---

# English

# Another title

[Known page](/shared-en)
[Unknown page](/not-a-page)
`,
      },
      {
        path: '/content/fr.md',
        source: `---
slug: shared-fr
key: shared
locale: fr
---

# Français
`,
      },
      {
        path: '/content/es.md',
        source: `---
slug: shared-es
locale: es
---

# Español
`,
      },
    ],
    registry(),
  )

  expect(scan.findings.map((finding) => finding.code)).toEqual(
    expect.arrayContaining([
      'CB_H1_MULTIPLE',
      'CB_INTERNAL_URL_UNRESOLVED',
      'CB_LOCALE_KEY_MISSING',
      'CB_LOCALE_KEY_INCOMPLETE',
    ]),
  )
  expect(
    scan.findings.some(
      (finding) =>
        finding.code === 'CB_INTERNAL_URL_UNRESOLVED' && finding.message.includes('/shared-en'),
    ),
  ).toBe(false)
})

test('integrity ignores relative assets and resolves relative page routes', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/start.md',
        source: '# Start\n\n[PDF](./manual.pdf)\n[Image](../assets/image.png)\n[Page](./other)\n',
      },
      { path: '/content/other.md', source: '---\nslug: other\n---\n\n# Other\n' },
    ],
    registry(),
  )

  expect(scan.findings.filter((finding) => finding.source === 'integrity')).toEqual([])
})

test('integrity decodes URL-encoded Markdown filenames before resolving them', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/start.md',
        source: '# Start\n\n[Other](./other%20page.md#details)\n[Missing](./missing%20page.md)\n',
      },
      { path: '/content/other page.md', source: '# Other\n\n## Details\n' },
    ],
    registry(),
  )

  expect(scan.findings.filter((finding) => finding.source === 'integrity')).toMatchObject([
    { code: 'CB_MARKDOWN_LINK_UNRESOLVED', line: 4 },
  ])
})

test('integrity resolves heading anchors the way renderers slug them', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/start.md',
        source: `# Install \`contentbit\` now

## Les tarifs détaillés

## Intro

## Intro

## Intro 1

## C++ & Rust

[Install](#install-contentbit-now)
[Languages](#c--rust)
[Prices](#les-tarifs-détaillés)
[Encoded prices](#les-tarifs-d%C3%A9taill%C3%A9s)
[Second intro](#intro-1)
[Intro 1 heading](#intro-1-1)
`,
      },
    ],
    registry(),
  )

  expect(scan.findings.filter((finding) => finding.source === 'integrity')).toEqual([])
})

test('integrity leaves the site root to the host app and checks other routes', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/start.md',
        source:
          '---\nslug: start\n---\n\n# Start\n\n[Home](/)\n[Home section](/#intro)\n[Contact](/contact)\n',
      },
    ],
    registry(),
  )

  expect(scan.findings.filter((finding) => finding.source === 'integrity')).toMatchObject([
    { code: 'CB_INTERNAL_URL_UNRESOLVED', message: expect.stringContaining('"/contact"') },
  ])
})

test('integrity reads page identity through configured field names', () => {
  const scan = scanContentProject(
    [{ path: '/content/start.md', source: '---\npermalink: start\n---\n\nNo heading here.\n' }],
    registry(),
    { linkOptions: { slugField: 'permalink' }, includeStatsFindings: false },
  )

  expect(scan.findings.filter((finding) => finding.source === 'integrity')).toMatchObject([
    { code: 'CB_H1_MISSING', file: '/content/start.md' },
  ])
})

function integrityLinks(scan: ReturnType<typeof scanContentProject>) {
  return scan.findings
    .filter((finding) => finding.source === 'integrity')
    .map((finding) => [finding.code, finding.message.match(/"([^"]+)"/)?.[1]])
}

test('integrity resolves internal URLs through configured routes', () => {
  const scan = scanContentProject(
    [
      { path: '/site/content/about.md', source: '# About\n' },
      { path: '/site/content/docs/index.mdx', source: '# Docs\n' },
      { path: '/site/content/docs/guides/doctor.mdx', source: '# Doctor\n\n## JSON output\n' },
      { path: '/site/content/blog/2026-01-hello.md', source: '---\nslug: hello\n---\n\n# Hello\n' },
      {
        path: '/site/content/start.md',
        source: `# Start

[About](/about)
[Docs](/docs)
[Doctor](/docs/guides/doctor)
[Doctor with slash](/docs/guides/doctor/)
[Doctor JSON](/docs/guides/doctor#json-output)
[Post](/blog/hello)
[Playground](/playground)
[Relative](./guides/doctor)
[Missing guide](/docs/guides/does-not-exist)
[Missing section](/docs/guides/doctor#missing)
[Post file name](/blog/2026-01-hello)
[Bare slug](/hello)
[Slug in the wrong section](/docs/hello)
`,
      },
    ],
    registry(),
    {
      linkOptions: {
        routes: {
          '/site/content': '/{path}',
          '/site/content/docs': '/docs/{path}',
          '/site/content/blog': '/blog/{slug}',
        },
        hostRoutes: ['/playground'],
      },
    },
  )

  expect(integrityLinks(scan)).toEqual([
    ['CB_INTERNAL_URL_UNRESOLVED', '/docs/guides/does-not-exist'],
    ['CB_MARKDOWN_ANCHOR_UNRESOLVED', '/docs/guides/doctor#missing'],
    ['CB_INTERNAL_URL_UNRESOLVED', '/blog/2026-01-hello'],
    ['CB_INTERNAL_URL_UNRESOLVED', '/hello'],
    ['CB_INTERNAL_URL_UNRESOLVED', '/docs/hello'],
  ])
})

test('routes fill page facts, and a page without the fact has no URL', () => {
  const scan = scanContentProject(
    [
      { path: '/content/guides/a.md', source: '---\nlocale: fr\nslug: bonjour\n---\n\n# A\n' },
      { path: '/content/guides/b.md', source: '---\nslug: hello\n---\n\n# B\n' },
      { path: '/content/guides/c.md', source: '# C\n' },
      {
        path: '/content/start.md',
        source:
          '# Start\n\n[French](/fr/guides/bonjour)\n[Default locale](/en/guides/hello)\n[No locale](/guides/hello)\n[No slug](/en/guides/c)\n',
      },
    ],
    registry(),
    {
      linkOptions: {
        defaultLocale: 'en',
        routes: { '/content/guides': '/{locale}/guides/{slug}', '/content': '/{path}' },
      },
    },
  )

  expect(integrityLinks(scan)).toEqual([
    ['CB_INTERNAL_URL_UNRESOLVED', '/guides/hello'],
    ['CB_INTERNAL_URL_UNRESOLVED', '/en/guides/c'],
  ])
})

test('host routes resolve alongside slug routes', () => {
  const scan = scanContentProject(
    [
      {
        path: '/content/start.md',
        source:
          '---\nslug: start\n---\n\n# Start\n\n[Playground](/playground/)\n[Start](/start)\n[Contact](/contact)\n',
      },
    ],
    registry(),
    { linkOptions: { hostRoutes: ['/playground'] } },
  )

  expect(integrityLinks(scan)).toEqual([['CB_INTERNAL_URL_UNRESOLVED', '/contact']])
})

test('routes reject unknown placeholders', () => {
  expect(() =>
    scanContentProject([{ path: '/content/a.md', source: '# A\n' }], registry(), {
      linkOptions: { routes: { '/content': '/{slg}' } },
    }),
  ).toThrow('{slg}')
})
