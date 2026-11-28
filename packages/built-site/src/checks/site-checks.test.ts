import { expect, test } from 'vitest'

import {
  checkSite,
  pagePath,
  type BuiltPage,
  type BuiltSite,
  type HreflangAlternate,
  type RenderedPageFacts,
} from '../index.js'

const ORIGIN = 'https://example.com'
const SITE_CODES = /^CB_SITE_/

function builtPage(path: string, facts: Partial<RenderedPageFacts> = {}): BuiltPage {
  return {
    path: pagePath(path),
    file: path.endsWith('/') ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`,
    facts: {
      title: `Title of ${path}`,
      description: `About ${path}`,
      canonical: `${ORIGIN}${path}`,
      robots: { noindex: false, nofollow: false },
      alternates: [],
      structuredData: [],
      headings: [{ level: 1, text: `Heading of ${path}` }],
      ids: [],
      links: [],
      images: [],
      textLength: 400,
      ...facts,
    },
  }
}

function builtSite(pages: BuiltPage[], extra: Partial<BuiltSite> = {}): BuiltSite {
  return {
    root: '/site/dist',
    pages,
    files: pages.map(({ file }) => file),
    redirects: [],
    ...extra,
  }
}

function alternates(entries: Record<string, string>): { alternates: HreflangAlternate[] } {
  return {
    alternates: Object.entries(entries).map(([hreflang, href]) => ({ hreflang, href })),
  }
}

function siteFindings(
  site: BuiltSite,
  options: Parameters<typeof checkSite>[1] = { origin: ORIGIN },
) {
  return checkSite(site, options)
    .filter(({ code }) => SITE_CODES.test(code))
    .map(({ code, severity, origin, message }) => ({
      code,
      severity,
      page: origin.kind === 'template' ? origin.pages : origin.page,
      message,
    }))
}

const group = { en: `${ORIGIN}/`, fr: `${ORIGIN}/fr/`, 'x-default': `${ORIGIN}/` }

test('pages that list each other as hreflang alternates, with an x-default, have no site findings', () => {
  const site = builtSite([
    builtPage('/', alternates(group)),
    builtPage('/fr/', alternates({ ...group, fr: '/fr' })),
  ])

  expect(siteFindings(site)).toEqual([])
})

test('an alternate to a page that lists no alternate back is reported on the page that lists it', () => {
  const site = builtSite([
    builtPage('/', alternates(group)),
    builtPage('/fr/', alternates({ fr: `${ORIGIN}/fr/` })),
  ])

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_HREFLANG_NOT_RECIPROCAL',
      severity: 'warning',
      page: '/',
      message: `The hreflang alternate ${ORIGIN}/fr/ points to /fr/, which lists no alternate back to this page.`,
    },
  ])
})

test('an alternate to no built page is reported; one on another origin is not', () => {
  const site = builtSite([
    builtPage(
      '/',
      alternates({ en: '/', de: `${ORIGIN}/de/`, es: 'https://example.es/', 'x-default': '/' }),
    ),
  ])

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_HREFLANG_NOT_RECIPROCAL',
      severity: 'warning',
      page: '/',
      message: `The hreflang alternate ${ORIGIN}/de/ points to no built page.`,
    },
  ])
})

test('a page with two or more alternates and no x-default is reported; one alternate needs none', () => {
  const site = builtSite([
    builtPage('/', alternates({ en: '/', fr: '/fr/' })),
    builtPage('/fr/', alternates({ en: '/', fr: '/fr/' })),
    builtPage('/solo/', alternates({ en: '/solo/' })),
  ])

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_HREFLANG_X_DEFAULT_MISSING',
      severity: 'warning',
      page: '/',
      message: 'The page lists 2 hreflang alternates and none is x-default.',
    },
    {
      code: 'CB_SITE_HREFLANG_X_DEFAULT_MISSING',
      severity: 'warning',
      page: '/fr/',
      message: 'The page lists 2 hreflang alternates and none is x-default.',
    },
  ])
})
