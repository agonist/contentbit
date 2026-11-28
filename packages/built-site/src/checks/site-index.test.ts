import { expect, test } from 'vitest'

import { pagePath, type BuiltPage, type BuiltSite, type RenderedPageFacts } from '../index.js'
import { createSiteIndex, type LinkTarget, type SiteIndexOptions } from './site-index.js'

function builtPage(path: string, file: string, ids: string[] = []): BuiltPage {
  const facts: RenderedPageFacts = {
    robots: { noindex: false, nofollow: false },
    alternates: [],
    structuredData: [],
    headings: [],
    ids,
    links: [],
    images: [],
    textLength: 0,
  }
  return { path: pagePath(path), file, facts }
}

const pages = [
  builtPage('/', 'index.html'),
  builtPage('/about/', 'about/index.html', ['team']),
  builtPage('/blog/first-post/', 'blog/first-post/index.html', ['intro', 'café', 'top-tips']),
  builtPage('/docs/guide', 'docs/guide.html', ['install']),
  builtPage('/fr/café/', 'fr/café/index.html'),
]

const site: BuiltSite = {
  root: '/site/dist',
  pages,
  files: [
    ...pages.map(({ file }) => file),
    '404.html',
    'guide.pdf',
    'fr/menu été.pdf',
    '_astro/cover.webp',
  ],
  redirects: [
    { from: '/old-about', to: '/about/', status: 301 },
    { from: '/archive/*', to: '/blog/:splat', status: 301 },
    { from: '/vs/:slug/', to: '/alternatives/:slug/', status: 301 },
    { from: '/app/*', to: '/app/index.html', status: 200 },
    { from: '/feed.xml', to: '/rss.xml', status: 302 },
    { from: 'https://old.example/*', to: '/', status: 301 },
  ],
}

function resolve(
  href: string,
  from = '/blog/first-post/',
  options: SiteIndexOptions = { origin: 'https://example.com' },
) {
  const index = createSiteIndex(site, options)
  const page = pages.find((built) => built.path === from)
  if (!page) throw new Error(`no test page ${from}`)
  return describe(index.resolveLink(href, page))
}

function describe(target: LinkTarget) {
  if (target.kind !== 'page') return target
  return { kind: 'page', page: target.page.path, ...(target.anchor && { anchor: target.anchor }) }
}

test.each([
  'mailto:hello@example.com',
  'tel:+33123456789',
  'javascript:void(0)',
  'data:text/plain,hi',
  'https://other.example/about/',
  '//other.example/about/',
  'http://example.com/about/',
  'https://',
])('%s is external', (href) => {
  expect(resolve(href)).toEqual({ kind: 'external' })
})

test('an absolute URL on the site origin is internal, and external when the origin is unknown', () => {
  expect(resolve('https://example.com/about/')).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('https://EXAMPLE.com/about/#team')).toEqual({
    kind: 'page',
    page: '/about/',
    anchor: 'team',
  })
  expect(resolve('//example.com/about/')).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('https://example.com/about/', '/blog/first-post/', {})).toEqual({
    kind: 'external',
  })
  expect(resolve('/about/', '/blog/first-post/', {})).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('../../about/', '/blog/first-post/', {})).toEqual({
    kind: 'page',
    page: '/about/',
  })
})

test('the origin option is normalized like any origin', () => {
  expect(resolve('https://example.com/', '/', { origin: 'https://Example.com/blog/' })).toEqual({
    kind: 'page',
    page: '/',
  })
})

test('a relative href resolves against the URL of the page it is on', () => {
  expect(resolve('../../about/')).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('./')).toEqual({ kind: 'page', page: '/blog/first-post/' })
  expect(resolve('')).toEqual({ kind: 'page', page: '/blog/first-post/' })
  expect(resolve('guide#install', '/docs/guide')).toEqual({
    kind: 'page',
    page: '/docs/guide',
    anchor: 'install',
  })
  expect(resolve('about/', '/')).toEqual({ kind: 'page', page: '/about/' })
})

test('the query string is ignored', () => {
  expect(resolve('/about/?ref=footer')).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('?page=2')).toEqual({ kind: 'page', page: '/blog/first-post/' })
})

test('/x and /x/ match each other, and /x/index.html and /x.html match their page', () => {
  expect(resolve('/about')).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('/docs/guide/')).toEqual({ kind: 'page', page: '/docs/guide' })
  expect(resolve('/about/index.html')).toEqual({ kind: 'page', page: '/about/' })
  expect(resolve('/index.html')).toEqual({ kind: 'page', page: '/' })
  expect(resolve('/docs/guide.html')).toEqual({ kind: 'page', page: '/docs/guide' })
})

test('percent-encoded paths and anchors are decoded before they are matched', () => {
  expect(resolve('/fr/caf%C3%A9/')).toEqual({ kind: 'page', page: '/fr/café/' })
  expect(resolve('/fr/café/')).toEqual({ kind: 'page', page: '/fr/café/' })
  expect(resolve('#caf%C3%A9')).toEqual({ kind: 'page', page: '/blog/first-post/', anchor: 'café' })
  expect(resolve('/fr/menu%20%C3%A9t%C3%A9.pdf')).toEqual({ kind: 'file', exists: true })
})

test('#, #top and text fragments point at the page with no anchor to check', () => {
  for (const href of ['#', '#top', '#TOP', '#:~:text=baking%20soda', '/about/#']) {
    expect(resolve(href)).not.toHaveProperty('anchor')
  }
  expect(resolve('#top-tips')).toEqual({
    kind: 'page',
    page: '/blog/first-post/',
    anchor: 'top-tips',
  })
  expect(resolve('#intro:~:text=static')).toEqual({
    kind: 'page',
    page: '/blog/first-post/',
    anchor: 'intro',
  })
  expect(resolve('/about/#missing')).toEqual({ kind: 'page', page: '/about/', anchor: 'missing' })
})

test('a path that a _redirects rule matches is a redirect, and its anchor is not checked', () => {
  expect(resolve('/old-about')).toEqual({ kind: 'redirect' })
  expect(resolve('/old-about/#team')).toEqual({ kind: 'redirect' })
  expect(resolve('/archive/2024/a-post/')).toEqual({ kind: 'redirect' })
  expect(resolve('/archive/')).toEqual({ kind: 'redirect' })
  expect(resolve('/archive')).toEqual({ kind: 'redirect' })
  expect(resolve('/vs/paprika')).toEqual({ kind: 'redirect' })
  expect(resolve('/vs/paprika/')).toEqual({ kind: 'redirect' })
  expect(resolve('/app/settings/profile')).toEqual({ kind: 'redirect' })
  expect(resolve('/feed.xml')).toEqual({ kind: 'redirect' })
})

test('a placeholder matches one segment and a rule on another domain matches nothing', () => {
  expect(resolve('/vs/')).toEqual({ kind: 'missing', path: '/vs/' })
  expect(resolve('/vs/paprika/pricing/')).toEqual({ kind: 'missing', path: '/vs/paprika/pricing/' })
  expect(resolve('/archived/')).toEqual({ kind: 'missing', path: '/archived/' })
  expect(resolve('/blog/2024/')).toEqual({ kind: 'missing', path: '/blog/2024/' })
})

test('a host route is an exact path, with or without its slashes', () => {
  const options = { origin: 'https://example.com', hostRoutes: ['/api/health', 'playground/'] }
  expect(resolve('/api/health', '/', options)).toEqual({ kind: 'host-route' })
  expect(resolve('/api/health/#status', '/', options)).toEqual({ kind: 'host-route' })
  expect(resolve('/playground', '/', options)).toEqual({ kind: 'host-route' })
  expect(resolve('/api/health/live', '/', options)).toEqual({
    kind: 'missing',
    path: '/api/health/live',
  })
  expect(resolve('/api/', '/', options)).toEqual({ kind: 'missing', path: '/api/' })
})

test('a path whose last segment has an extension other than .html is a file', () => {
  expect(resolve('/guide.pdf')).toEqual({ kind: 'file', exists: true })
  expect(resolve('/_astro/cover.webp?v=2#x')).toEqual({ kind: 'file', exists: true })
  expect(resolve('/missing.pdf')).toEqual({ kind: 'file', exists: false })
  expect(resolve('/blog/first-post/cover.JPG')).toEqual({ kind: 'file', exists: false })
  expect(resolve('/404.html')).toEqual({ kind: 'file', exists: true })
  expect(resolve('/gone.html')).toEqual({ kind: 'missing', path: '/gone.html' })
  expect(resolve('/v1.2/')).toEqual({ kind: 'missing', path: '/v1.2/' })
})

test('a path that matches nothing is missing', () => {
  expect(resolve('/blog/second-post/')).toEqual({ kind: 'missing', path: '/blog/second-post/' })
  expect(resolve('https://example.com/nope?x=1#y')).toEqual({ kind: 'missing', path: '/nope' })
})

test('hasId answers from the ids on the page', () => {
  const index = createSiteIndex(site)
  const post = pages[2]
  expect(index.hasId(post, 'intro')).toBe(true)
  expect(index.hasId(post, 'team')).toBe(false)
  expect(index.hasId(pages[1], 'team')).toBe(true)
})
