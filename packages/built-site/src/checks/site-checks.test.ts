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

const noindex = { robots: { noindex: true, nofollow: false } }

function sitemap(...paths: string[]): Partial<BuiltSite> {
  return {
    sitemap: {
      files: ['sitemap.xml'],
      urls: paths.map((path) => (path.startsWith('http') ? path : `${ORIGIN}${path}`)),
    },
  }
}

test('a sitemap that lists every indexable page, with or without its trailing slash, has no site findings', () => {
  const site = builtSite(
    [
      builtPage('/'),
      builtPage('/blog/'),
      builtPage('/docs/guide'),
      builtPage('/old/', { redirect: '/blog/' }),
    ],
    {
      ...sitemap('/', '/blog', '/docs/guide/', '/moved', '/guide.pdf'),
      files: ['index.html', 'blog/index.html', 'docs/guide.html', 'old/index.html', 'guide.pdf'],
      redirects: [{ from: '/moved', to: '/blog/', status: 301 }],
    },
  )

  expect(siteFindings(site)).toEqual([])
})

test('a sitemap URL that resolves to no built page or file is an error on that URL path, once', () => {
  const site = builtSite([builtPage('/')], sitemap('/', '/gone/', '/gone/', '/menu.pdf'))

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_SITEMAP_URL_NOT_BUILT',
      severity: 'error',
      page: '/gone/',
      message: `The sitemap lists ${ORIGIN}/gone/, which resolves to no built page.`,
    },
    {
      code: 'CB_SITE_SITEMAP_URL_NOT_BUILT',
      severity: 'error',
      page: '/menu.pdf',
      message: `The sitemap lists ${ORIGIN}/menu.pdf, which resolves to no built page.`,
    },
  ])
})

test('a sitemap URL on another origin is an error that names that origin', () => {
  const site = builtSite([builtPage('/')], sitemap('/', 'https://www.example.com/'))

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_SITEMAP_URL_NOT_BUILT',
      severity: 'error',
      page: '/',
      message: `The sitemap lists https://www.example.com/, on https://www.example.com instead of the site origin ${ORIGIN}.`,
    },
  ])
})

test('a sitemap URL that resolves to a noindex page is reported on that page', () => {
  const site = builtSite([builtPage('/'), builtPage('/drafts/', noindex)], sitemap('/', '/drafts'))

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_SITEMAP_NOINDEX',
      severity: 'warning',
      page: '/drafts/',
      message: `The sitemap lists ${ORIGIN}/drafts, a page marked noindex.`,
    },
  ])
})

test('an indexable page missing from the sitemap is reported; noindex and canonical-elsewhere pages are not expected', () => {
  const site = builtSite(
    [
      builtPage('/'),
      builtPage('/about/'),
      builtPage('/private/', noindex),
      builtPage('/print/', { canonical: `${ORIGIN}/` }),
    ],
    sitemap('/'),
  )

  expect(siteFindings(site)).toEqual([
    {
      code: 'CB_SITE_SITEMAP_PAGE_MISSING',
      severity: 'warning',
      page: '/about/',
      message: 'This indexable page is not in the sitemap.',
    },
  ])
})

test('without a known origin or without a sitemap, the sitemap checks report nothing', () => {
  const pages = [builtPage('/'), builtPage('/about/'), builtPage('/drafts/', noindex)]
  const listed = sitemap('/gone/', '/drafts/', 'https://elsewhere.example/')

  expect(siteFindings(builtSite(pages, listed), {})).toEqual([])
  expect(siteFindings(builtSite(pages))).toEqual([])
})
