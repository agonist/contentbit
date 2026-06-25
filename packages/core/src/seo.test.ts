import { expect, test } from 'vitest'
import { z } from 'zod'

import { markdownBody } from './content-models.js'
import { createSeoBrief, defineSeoConfig, evaluateSeoProject, parseSeoConfig } from './seo.js'
import { createBlockRegistry, defineBlock } from './registry.js'
import { scanContentProject } from './project-scan.js'

const comparison = defineBlock({
  name: 'comparison',
  description: 'Comparison.',
  props: z.object({}),
  content: markdownBody(),
  authoring: { useWhen: [], avoidWhen: [], example: '' },
})

const faq = defineBlock({
  name: 'faq',
  description: 'FAQ.',
  props: z.object({}),
  content: markdownBody(),
  authoring: { useWhen: [], avoidWhen: [], example: '' },
})

const registry = () => createBlockRegistry().add(comparison).add(faq)

const seoConfig = defineSeoConfig({
  pageTypes: {
    alternative: {
      requiredFrontmatter: ['type', 'intent', 'keywords.primary'],
      requiredSections: [
        { id: 'overview', headings: ['Overview', 'Summary'] },
        { id: 'alternatives', headings: ['Best alternatives', 'Top alternatives'] },
        { id: 'comparison', headings: ['Comparison', 'Feature comparison'] },
      ],
      requiredBlocks: ['comparison'],
      recommendedBlocks: ['faq'],
      requiredLinksTo: ['seo-tools-comparison'],
      minOutgoingLinks: 2,
      minIncomingLinks: 1,
    },
  },
  pages: {
    'ahrefs-alternatives': {
      type: 'alternative',
      key: 'ahrefs-alternatives',
      slug: 'ahrefs-alternatives',
      title: 'Planned title',
      intent: 'commercial',
      keywords: { primary: 'ahrefs alternatives' },
      linksTo: ['seo-tools-comparison'],
    },
    'semrush-alternatives': {
      type: 'alternative',
      key: 'semrush-alternatives',
      slug: 'semrush-alternatives',
      title: 'Semrush Alternatives',
      intent: 'commercial',
      keywords: { primary: 'semrush alternatives' },
      linksTo: ['seo-tools-comparison'],
    },
  },
})

test('parseSeoConfig reports invalid config as SEO errors', () => {
  const parsed = parseSeoConfig({ pageTypes: { alternative: { minOutgoingLinks: -1 } } }, 'seo.ts')

  expect(parsed.ok).toBe(false)
  if (!parsed.ok) {
    expect(parsed.findings[0]).toMatchObject({
      severity: 'error',
      source: 'seo',
      code: 'CB_SEO_CONFIG_INVALID',
      file: 'seo.ts',
    })
  }
})

test('scanContentProject folds SEO findings into the repair plan', () => {
  const scan = scanContentProject(
    [
      {
        path: 'ahrefs.md',
        source: `---
key: ahrefs-alternatives
slug: ahrefs-alternatives
title: Actual title
type: alternative
intent: commercial
keywords:
  primary: ahrefs alternatives
linksTo:
  - seo-tools-comparison
---

# Actual title

## Overview

Useful overview text.

## Feature comparison

:::comparison
Feature details.
:::
`,
      },
      {
        path: 'comparison.md',
        source: `---
key: seo-tools-comparison
slug: seo-tools-comparison
linksTo:
  - ahrefs-alternatives
---

# SEO tools comparison
`,
      },
    ],
    registry(),
    { seoConfig },
  )

  expect(scan.seo?.pages.find((page) => page.id === 'ahrefs-alternatives')).toMatchObject({
    source: 'existing',
    title: 'Actual title',
  })
  expect(scan.findings.map((finding) => finding.code)).toContain('CB_SEO_SECTION_MISSING')
  expect(scan.findings.map((finding) => finding.code)).toContain('CB_SEO_BLOCK_RECOMMENDED')
  expect(scan.findings.map((finding) => finding.code)).toContain('CB_SEO_OUTGOING_LINKS_MIN')
})

test('createSeoBrief works for planned pages', () => {
  const evaluation = evaluateSeoProject({
    config: seoConfig,
    files: [],
  })
  const brief = createSeoBrief(evaluation, 'semrush-alternatives')

  expect(brief).toMatchObject({
    schemaVersion: 'contentbit.seo.brief.v1',
    target: {
      id: 'semrush-alternatives',
      source: 'planned',
      type: 'alternative',
    },
  })
  expect(brief.requiredSections.map((section) => section.id)).toEqual([
    'overview',
    'alternatives',
    'comparison',
  ])
  expect(brief.acceptanceChecks).toContain('Create the Markdown source file for this planned page.')
})

test('relative path config entries merge with absolute scanned file paths', () => {
  const scan = scanContentProject(
    [
      {
        path: '/repo/site/content/docs/guides/doctor.mdx',
        source: `---
title: Content doctor
description: Repair plan.
---

# Content doctor

## Overview

Useful overview text.
`,
      },
    ],
    registry(),
    {
      seoConfig: defineSeoConfig({
        pageTypes: {
          guide: {
            requiredFrontmatter: ['type', 'title', 'description', 'slug', 'keywords.primary'],
            requiredSections: ['Overview'],
          },
        },
        pages: {
          'content/docs/guides/doctor.mdx': {
            type: 'guide',
            key: 'doctor',
            slug: 'docs/guides/doctor',
            intent: 'informational',
            keywords: { primary: 'contentbit doctor' },
          },
        },
      }),
    },
  )

  expect(scan.seo?.pages).toHaveLength(1)
  expect(scan.seo?.pages[0]).toMatchObject({
    id: 'doctor',
    source: 'existing',
    key: 'doctor',
    slug: 'docs/guides/doctor',
    type: 'guide',
    title: 'Content doctor',
  })
  expect(scan.seo?.findings).toEqual([])
})
