import { extractFrontmatter, readContentPageFacts } from '@contentbit/core'
import { expect, test } from 'vitest'

import {
  attributeToSources,
  checkSite,
  groupTemplateFindings,
  pagePath,
  siteFinding,
  type BuiltPage,
  type BuiltSite,
  type Landmark,
  type PagePath,
  type RenderedPageFacts,
  type SourceDocument,
} from './index.js'

function builtPage(path: string, facts: Partial<RenderedPageFacts> = {}): BuiltPage {
  return {
    path: pagePath(path),
    file: `${path.slice(1)}index.html`,
    facts: {
      title: `Title of ${path}`,
      description: `About ${path}`,
      canonical: path,
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

function builtSite(pages: BuiltPage[]): BuiltSite {
  return { root: '/site/dist', pages, files: pages.map(({ file }) => file), redirects: [] }
}

const link = (href: string, landmark?: Landmark, selector = 'a') => ({
  href,
  selector,
  ...(landmark && { landmark }),
})

function sources(documents: Record<string, string>): Map<PagePath, SourceDocument> {
  return new Map(
    Object.entries(documents).map(([path, text]) => [
      pagePath(path),
      {
        file: `/site/content${path.slice(0, -1)}.md`,
        text,
        route: path,
        facts: readContentPageFacts(extractFrontmatter(text)?.data ?? {}),
      },
    ]),
  )
}

const origins = (site: BuiltSite, documents: Record<string, string>) =>
  attributeToSources(checkSite(site), sources(documents)).map(({ code, target, origin }) => ({
    code,
    target,
    origin,
  }))

test('a finding whose target the source document writes points at the first place it is written', () => {
  const site = builtSite([
    builtPage('/guide/', {
      links: [link('/gone/', 'main'), link('/fr/', 'nav'), link('/old/', 'main')],
    }),
    builtPage('/other/', { links: [link('/gone/', 'main')] }),
  ])
  const guide = [
    '---',
    'title: Guide',
    '---',
    '',
    'Read [the old page](/gone/) and the [French one](/fr/blog/).',
    'See [it again](/gone/ "Gone").',
  ].join('\n')

  expect(origins(site, { '/guide/': guide })).toEqual([
    {
      code: 'CB_LINK_PAGE_MISSING',
      target: '/gone/',
      origin: {
        kind: 'source',
        file: '/site/content/guide.md',
        line: 5,
        column: 21,
        page: '/guide/',
      },
    },
    { code: 'CB_LINK_PAGE_MISSING', target: '/fr/', origin: { kind: 'page', page: '/guide/' } },
    { code: 'CB_LINK_PAGE_MISSING', target: '/old/', origin: { kind: 'page', page: '/guide/' } },
    { code: 'CB_LINK_PAGE_MISSING', target: '/gone/', origin: { kind: 'page', page: '/other/' } },
  ])
})

test('a duplicated title written in the frontmatter points at its line', () => {
  const site = builtSite([
    builtPage('/a/', { title: 'Recipes' }),
    builtPage('/b/', { title: 'Recipes' }),
  ])

  expect(origins(site, { '/a/': '---\nslug: a\ntitle: "Recipes"\n---\n\nText.\n' })).toEqual([
    {
      code: 'CB_PAGE_TITLE_DUPLICATE',
      target: 'Recipes',
      origin: { kind: 'source', file: '/site/content/a.md', line: 3, column: 9, page: '/a/' },
    },
    { code: 'CB_PAGE_TITLE_DUPLICATE', target: 'Recipes', origin: { kind: 'page', page: '/b/' } },
  ])
})

test('a missing title or description is a source finding at line 1 when the frontmatter lacks it too', () => {
  const missing = { title: undefined, description: undefined, canonical: undefined }
  const site = builtSite([
    builtPage('/a/', missing),
    builtPage('/b/', missing),
    builtPage('/c/', missing),
  ])

  expect(
    origins(site, {
      '/a/': '---\ndescription: About A.\n---\n\nText.\n',
      '/b/': '---\ntitle: B\n---\n\nText.\n',
    }).map(({ code, origin }) => [code, origin]),
  ).toEqual([
    ['CB_PAGE_CANONICAL_MISSING', { kind: 'page', page: '/a/' }],
    ['CB_PAGE_DESCRIPTION_MISSING', { kind: 'page', page: '/a/' }],
    ['CB_PAGE_TITLE_MISSING', { kind: 'source', file: '/site/content/a.md', line: 1, page: '/a/' }],
    ['CB_PAGE_CANONICAL_MISSING', { kind: 'page', page: '/b/' }],
    [
      'CB_PAGE_DESCRIPTION_MISSING',
      { kind: 'source', file: '/site/content/b.md', line: 1, page: '/b/' },
    ],
    ['CB_PAGE_TITLE_MISSING', { kind: 'page', page: '/b/' }],
    ['CB_PAGE_CANONICAL_MISSING', { kind: 'page', page: '/c/' }],
    ['CB_PAGE_DESCRIPTION_MISSING', { kind: 'page', page: '/c/' }],
    ['CB_PAGE_TITLE_MISSING', { kind: 'page', page: '/c/' }],
  ])
})

const noindex = { robots: { noindex: true, nofollow: false } }

const located = (site: BuiltSite, documents: Record<string, string> = {}) =>
  groupTemplateFindings(attributeToSources(checkSite(site), sources(documents)))

const places = (findings: ReturnType<typeof located>) =>
  findings.map(({ code, element, origin }) =>
    origin.kind === 'template'
      ? `${code} ${element ?? '-'} on ${origin.pages.join(' ')}`
      : `${code} ${element ?? '-'} at ${origin.kind === 'page' ? origin.page : `${origin.file}:${origin.line}`}`,
  )

test('page findings with the same code and element on two pages become one template finding with every occurrence', () => {
  const toc = (...hrefs: string[]) => hrefs.map((href) => link(href, 'nav', 'a.toc-link'))
  const site = builtSite([
    builtPage('/a/', { links: toc('#one', '#two') }),
    builtPage('/b/', { links: toc('#three') }),
  ])

  expect(located(site)).toEqual([
    {
      code: 'CB_LINK_ANCHOR_MISSING',
      severity: 'error',
      message:
        'nav a.toc-link gives this finding on 2 pages, so the layout or a shared component renders it. On /a/: The link #one points to an id that this page does not have.',
      hint: 'Point the link at an id the page has, or give the element it means that id.',
      element: 'nav a.toc-link',
      origin: { kind: 'template', element: 'nav a.toc-link', pages: ['/a/', '/b/'] },
      occurrences: [
        { page: '/a/', target: '#one' },
        { page: '/a/', target: '#two' },
        { page: '/b/', target: '#three' },
      ],
    },
  ])
})

test('an element on one page stays a page finding, however often it occurs there', () => {
  const site = builtSite([
    builtPage('/a/', { links: [link('#one', 'main'), link('#two', 'main')] }),
    builtPage('/b/', { links: [link('#three', 'aside')], canonical: undefined }),
    builtPage('/c/', { canonical: undefined }),
  ])

  expect(places(located(site))).toEqual([
    'CB_LINK_ANCHOR_MISSING main a at /a/',
    'CB_LINK_ANCHOR_MISSING main a at /a/',
    'CB_LINK_ANCHOR_MISSING aside a at /b/',
    'CB_PAGE_CANONICAL_MISSING link[rel=canonical] on /b/ /c/',
  ])
})

test('the same href in the footer and in main gives one template finding for each element', () => {
  const site = builtSite([
    builtPage('/a/', { links: [link('/private/', 'main'), link('/private/', 'footer')] }),
    builtPage('/b/', { links: [link('/private/', 'footer'), link('/private/', 'main')] }),
    builtPage('/private/', noindex),
  ])

  expect(places(located(site))).toEqual([
    'CB_LINK_NOINDEX_TARGET main a on /a/ /b/',
    'CB_LINK_NOINDEX_TARGET footer a on /a/ /b/',
  ])
})

test('a bare element in the page content groups only when the same target repeats on other pages', () => {
  const site = builtSite([
    builtPage('/a/', { links: [link('/gone-a/', 'main'), link('/private/', 'main')] }),
    builtPage('/b/', { links: [link('/gone-b/', 'main'), link('/private/', 'main')] }),
    builtPage('/private/', noindex),
  ])

  expect(places(located(site))).toEqual([
    'CB_LINK_NOINDEX_TARGET main a on /a/ /b/',
    'CB_LINK_PAGE_MISSING main a at /a/',
    'CB_LINK_PAGE_MISSING main a at /b/',
  ])
})

test('duplicate titles and descriptions never group: each finding already names the other pages', () => {
  const site = builtSite(
    ['/a/', '/b/', '/c/'].map((path) => builtPage(path, { title: 'Same', description: 'Same.' })),
  )

  expect(places(located(site))).toEqual([
    'CB_PAGE_DESCRIPTION_DUPLICATE meta[name=description] at /a/',
    'CB_PAGE_TITLE_DUPLICATE title at /a/',
    'CB_PAGE_DESCRIPTION_DUPLICATE meta[name=description] at /b/',
    'CB_PAGE_TITLE_DUPLICATE title at /b/',
    'CB_PAGE_DESCRIPTION_DUPLICATE meta[name=description] at /c/',
    'CB_PAGE_TITLE_DUPLICATE title at /c/',
  ])
})

test('findings without an element group by code alone', () => {
  const sitemap = (page: string) =>
    siteFinding(
      'CB_SITE_SITEMAP_URL_NOT_BUILT',
      { kind: 'page', page: pagePath(page) },
      `The sitemap lists ${page}, which is not built.`,
      undefined,
      { target: `https://example.com${page}` },
    )

  expect(groupTemplateFindings([sitemap('/x/'), sitemap('/y/')])).toEqual([
    {
      code: 'CB_SITE_SITEMAP_URL_NOT_BUILT',
      severity: 'error',
      message:
        'This finding comes up on 2 pages. On /x/: The sitemap lists /x/, which is not built.',
      origin: { kind: 'template', pages: ['/x/', '/y/'] },
      occurrences: [
        { page: '/x/', target: 'https://example.com/x/' },
        { page: '/y/', target: 'https://example.com/y/' },
      ],
    },
  ])
})

test('a finding its source document writes is not grouped with the page findings left', () => {
  const site = builtSite([
    builtPage('/a/', { links: [link('/gone/', 'main')] }),
    builtPage('/b/', { links: [link('/gone/', 'main')] }),
    builtPage('/c/', { links: [link('/gone/', 'main')] }),
  ])

  expect(places(located(site, { '/a/': 'See [the page](/gone/).\n' }))).toEqual([
    'CB_LINK_PAGE_MISSING main a at /site/content/a.md:1',
    'CB_LINK_PAGE_MISSING main a on /b/ /c/',
  ])
  expect(places(located(site, { '/a/': '[x](/gone/)', '/b/': '[x](/gone/)' }))).toEqual([
    'CB_LINK_PAGE_MISSING main a at /site/content/a.md:1',
    'CB_LINK_PAGE_MISSING main a at /site/content/b.md:1',
    'CB_LINK_PAGE_MISSING main a at /c/',
  ])
})
