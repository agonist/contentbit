import { extractFrontmatter, readContentPageFacts } from '@contentbit/core'
import { expect, test } from 'vitest'

import {
  attributeToSources,
  checkSite,
  pagePath,
  siteSources,
  type BuiltPage,
  type BuiltSite,
  type RenderedPageFacts,
  type SiteSourceOptions,
  type SourceDocument,
} from '../index.js'

const SOURCE_CODES = /MISMATCH|SOURCE_NOT_BUILT/
const NOW = new Date(2026, 10, 28, 12)

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

function builtSite(pages: BuiltPage[], extra: Partial<BuiltSite> = {}): BuiltSite {
  return { root: '/site/dist', pages, files: [], redirects: [], ...extra }
}

function document(route: string | undefined, text: string): SourceDocument {
  const name = route?.replace(/^\/|\/$/g, '') || 'index'
  return {
    file: `/site/content/${name}.md`,
    text,
    ...(route !== undefined && { route }),
    facts: readContentPageFacts(extractFrontmatter(text)?.data ?? {}),
  }
}

const frontmatter = (fields: Record<string, string>) =>
  `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}\n---\n\nText.\n`

function sourceFindings(
  site: BuiltSite,
  documents: SourceDocument[],
  options: Parameters<typeof checkSite>[1] = {},
  sourceOptions: Partial<SiteSourceOptions> = {},
) {
  const sources = siteSources(site, documents, { now: NOW, ...sourceOptions })
  return attributeToSources(checkSite(site, { ...options, sources }), sources.pages)
    .filter(({ code }) => SOURCE_CODES.test(code))
    .map(({ code, severity, target, element, origin }) => ({
      code,
      severity,
      target,
      element,
      at: origin.kind === 'source' ? `${origin.file}:${origin.line}` : origin.kind,
    }))
}

test('a rendered title with a site suffix and a shortened description agree with the frontmatter', () => {
  const site = builtSite([
    builtPage('/post/', {
      title: 'How  to Proof Dough | Fond',
      description: 'Proof dough in the fridge.',
    }),
  ])
  const post = document(
    '/post/',
    frontmatter({
      title: 'How to proof dough',
      description: 'Proof dough in the fridge. It takes a day and gives a better crust.',
    }),
  )

  expect(sourceFindings(site, [post])).toEqual([])
})

test('a title or description the page does not render is a finding on its frontmatter line', () => {
  const site = builtSite([
    builtPage('/post/', { title: 'Bread basics | Fond', description: 'All about bread.' }),
  ])
  const post = document(
    '/post/',
    frontmatter({ slug: 'post', title: 'How to proof dough', description: 'Proof it cold.' }),
  )

  expect(sourceFindings(site, [post])).toEqual([
    {
      code: 'CB_PAGE_DESCRIPTION_MISMATCH',
      severity: 'warning',
      target: 'Proof it cold.',
      element: 'meta[name=description]',
      at: '/site/content/post.md:4',
    },
    {
      code: 'CB_PAGE_TITLE_MISMATCH',
      severity: 'warning',
      target: 'How to proof dough',
      element: 'title',
      at: '/site/content/post.md:3',
    },
  ])
})

test('a mismatch the frontmatter writes with YAML escapes points at line 1', () => {
  const site = builtSite([builtPage('/post/', { title: 'Bread basics' })])
  const post = document('/post/', frontmatter({ title: '"Say \\"rise\\""' }))

  expect(sourceFindings(site, [post])).toEqual([
    {
      code: 'CB_PAGE_TITLE_MISMATCH',
      severity: 'warning',
      target: 'Say "rise"',
      element: 'title',
      at: '/site/content/post.md:1',
    },
  ])
})

test('a page that is not indexable, or that renders no title, gets no mismatch', () => {
  const site = builtSite([
    builtPage('/hidden/', { robots: { noindex: true, nofollow: false } }),
    builtPage('/bare/', { title: undefined, description: undefined }),
  ])
  const documents = ['/hidden/', '/bare/'].map((route) =>
    document(route, frontmatter({ title: 'Other', description: 'Other.' })),
  )

  expect(sourceFindings(site, documents)).toEqual([])
})

test('a document whose route has no built page, redirect or host route is an error at its line 1', () => {
  const site = builtSite([builtPage('/')], {
    redirects: [{ from: '/moved', to: '/', status: 301 }],
  })
  const documents = [
    document('/blog/new-post', frontmatter({ title: 'New post' })),
    document('/moved/', frontmatter({ title: 'Moved' })),
    document('/app/', frontmatter({ title: 'App' })),
    document(undefined, frontmatter({ title: 'Snippet' })),
  ]

  expect(sourceFindings(site, documents, { hostRoutes: ['/app'] })).toEqual([
    {
      code: 'CB_SITE_SOURCE_NOT_BUILT',
      severity: 'error',
      target: '/blog/new-post',
      element: undefined,
      at: '/site/content/blog/new-post.md:1',
    },
  ])
})

test('a draft or a document dated after today gets no source findings, built or not', () => {
  const site = builtSite([builtPage('/built-draft/', { title: 'Old title' })])
  const documents = [
    document('/built-draft/', frontmatter({ title: 'New title', draft: 'true' })),
    document('/draft/', frontmatter({ title: 'Draft', draft: 'true' })),
    document('/tomorrow/', frontmatter({ title: 'Tomorrow', date: '2026-11-29' })),
    document('/later/', frontmatter({ title: 'Later', date: '"2027-01-05T09:00:00Z"' })),
    document('/today/', frontmatter({ title: 'Today', date: '2026-11-28' })),
    document('/not-a-draft/', frontmatter({ title: 'Not a draft', draft: 'false' })),
  ]

  expect(sourceFindings(site, documents).map(({ code, target }) => [code, target])).toEqual([
    ['CB_SITE_SOURCE_NOT_BUILT', '/not-a-draft/'],
    ['CB_SITE_SOURCE_NOT_BUILT', '/today/'],
  ])
})

test('site.draftField and site.dateField name the frontmatter fields that hold them', () => {
  const site = builtSite([builtPage('/')])
  const documents = [
    document('/hidden/', frontmatter({ title: 'Hidden', unlisted: 'true', draft: 'false' })),
    document('/scheduled/', frontmatter({ title: 'Scheduled', publishedOn: 'December 3, 2026' })),
    document('/dated/', frontmatter({ title: 'Dated', date: '2027-01-01', draft: 'true' })),
  ]

  expect(
    sourceFindings(site, documents, {}, { draftField: 'unlisted', dateField: 'publishedOn' }).map(
      ({ target }) => target,
    ),
  ).toEqual(['/dated/'])
})
