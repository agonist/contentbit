import { expect, test } from 'vitest'

import {
  attributeToSources,
  checkSite,
  pagePath,
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
      { file: `/site/content${path.slice(0, -1)}.md`, text },
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
