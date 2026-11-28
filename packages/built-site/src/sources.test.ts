import { expect, test } from 'vitest'

import { pagePath, siteSources, type BuiltSite, type SourceDocument } from './index.js'

const site: BuiltSite = {
  root: '/site/dist',
  pages: ['/', '/blog/post/', '/about'].map((path) => ({
    path: pagePath(path),
    file: path === '/about' ? 'about.html' : `${path.slice(1)}index.html`,
    facts: {
      robots: { noindex: false, nofollow: false },
      alternates: [],
      structuredData: [],
      headings: [],
      ids: [],
      links: [],
      images: [],
      textLength: 0,
    },
  })),
  files: [],
  redirects: [],
}

const document = (name: string, route?: string): SourceDocument => ({
  file: `/site/content/${name}.md`,
  text: `# ${name}\n`,
  ...(route !== undefined && { route }),
  facts: { frontmatter: {} },
})

test('a built page gets the document whose route is its path, with or without the slashes', () => {
  const home = document('index', '/')
  const post = document('post', '/blog/post')
  const about = document('about', '/about/')

  const { pages, unbuilt } = siteSources(site, [home, post, about])
  expect([...pages]).toEqual([
    ['/', home],
    ['/blog/post/', post],
    ['/about', about],
  ])
  expect(unbuilt).toEqual([])
})

test('a document whose route no built page has is unbuilt; one without a route is not', () => {
  const draft = document('draft', '/blog/draft/')
  const snippet = document('snippet')

  const { pages, unbuilt } = siteSources(site, [draft, snippet])
  expect(pages.size).toBe(0)
  expect(unbuilt).toEqual([draft])
})

test('two documents with the same route give the page the first one, and neither is unbuilt', () => {
  const first = document('post', '/blog/post/')
  const second = document('post-copy', '/blog/post/')

  const { pages, unbuilt } = siteSources(site, [first, second])
  expect(pages.get(pagePath('/blog/post/'))).toBe(first)
  expect(unbuilt).toEqual([])
})
