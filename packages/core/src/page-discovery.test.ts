import { expect, test } from 'vitest'

import { analyzeDocument } from './analyze.js'
import { discoverContentPageFacts } from './page-discovery.js'

test('authored page facts remain exact and authoritative', () => {
  const facts = discoverContentPageFacts({
    path: '/content/guides/start.md',
    frontmatter: {
      key: 'guides/start',
      slug: 'getting-started',
      locale: 'en',
      title: 'Getting started',
      description: 'Start here.',
      type: 'guide',
      intent: 'learn',
      keywords: { primary: 'getting started' },
      linksTo: ['next-step'],
    },
    stats: analyzeDocument('# Ignored fallback'),
  })

  expect(facts).toMatchObject({
    identity: { value: 'guides/start', source: 'frontmatter', confidence: 'exact' },
    key: { value: 'guides/start', source: 'frontmatter', confidence: 'exact' },
    slug: { value: 'getting-started', source: 'frontmatter', confidence: 'exact' },
    title: { value: 'Getting started', source: 'frontmatter', confidence: 'exact' },
    locale: { value: 'en', source: 'frontmatter', confidence: 'exact' },
    type: { value: 'guide', source: 'frontmatter', confidence: 'exact' },
    keywords: {
      value: { primary: 'getting started' },
      source: 'frontmatter',
      confidence: 'exact',
    },
    linksTo: { value: ['next-step'], source: 'frontmatter', confidence: 'exact' },
  })
})

test('configured field names retain config provenance', () => {
  const facts = discoverContentPageFacts(
    {
      path: '/content/fr/start.md',
      frontmatter: {
        canonicalKey: 'guides/start',
        pathSlug: 'bien-demarrer',
        lang: 'fr',
        seoKeywords: { primary: 'bien démarrer' },
      },
      stats: analyzeDocument('# Bien démarrer'),
    },
    { keyField: 'canonicalKey', slugField: 'pathSlug', localeField: 'lang' },
  )

  expect(facts).toMatchObject({
    identity: { value: 'guides/start', source: 'config', confidence: 'exact' },
    slug: { value: 'bien-demarrer', source: 'config', confidence: 'exact' },
    locale: { value: 'fr', source: 'config', confidence: 'exact' },
    keywords: {
      value: { primary: 'bien démarrer' },
      source: 'frontmatter',
      confidence: 'exact',
    },
  })
})

test('an unconfigured page falls back to document and path facts with provenance', () => {
  const path = '/content/blog/cafe-creme.md'
  const facts = discoverContentPageFacts({
    path,
    frontmatter: {},
    stats: analyzeDocument('# Café crème\n\nA short introduction.'),
  })

  expect(facts).toEqual({
    identity: { value: path, source: 'path', confidence: 'exact' },
    title: { value: 'Café crème', source: 'document', confidence: 'likely' },
    slug: { value: 'cafe-creme', source: 'path', confidence: 'guess' },
  })
})

test('filename supplies a guessed title when the document has no h1', () => {
  const facts = discoverContentPageFacts({
    path: 'content/quick_start.mdx',
    frontmatter: {},
    stats: analyzeDocument('## Overview'),
  })

  expect(facts.title).toEqual({
    value: 'Quick Start',
    source: 'path',
    confidence: 'guess',
  })
})
