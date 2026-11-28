import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

import { readBuildFolder } from './index.js'

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))

async function buildFolder(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-built-site-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf8')
  }
  return dir
}

const page = (title: string) =>
  `<!doctype html><html><head><title>${title}</title></head><body></body></html>`

test('an Astro-like build reads into built pages sorted by path, without its 404 page', async () => {
  const site = await readBuildFolder(fixture('astro-like'))

  expect(site.root).toBe(fixture('astro-like'))
  expect(site.pages.map(({ path, file }) => ({ path, file }))).toEqual([
    { path: '/', file: 'index.html' },
    { path: '/blog/first-post/', file: 'blog/first-post/index.html' },
    { path: '/fr/blog/first-post/', file: 'fr/blog/first-post/index.html' },
  ])
  expect(site.pages.map((built) => built.facts.title)).toEqual([
    'Harbor Notes',
    "Shipping a static site: what works & what doesn't | Harbor Notes",
    'Publier un site statique | Harbor Notes',
  ])
})

test('the sitemap starts from robots.txt and follows the sitemap index', async () => {
  const site = await readBuildFolder(fixture('astro-like'))

  expect(site.robots).toEqual({
    sitemaps: ['https://harbor.example/sitemap-index.xml'],
    disallow: [],
  })
  expect(site.sitemap).toEqual({
    files: ['sitemap-index.xml', 'sitemap-0.xml'],
    urls: [
      'https://harbor.example/',
      'https://harbor.example/blog/first-post/',
      'https://harbor.example/fr/blog/first-post/',
    ],
  })
})

test('_redirects lines become redirects, 301 unless they give a status', async () => {
  const site = await readBuildFolder(fixture('astro-like'))

  expect(site.redirects).toEqual([
    { from: '/blog/hello-world', to: '/blog/first-post/', status: 301 },
    { from: '/feed', to: '/rss.xml', status: 302 },
    { from: '/fr/blog/premier-article', to: '/fr/blog/first-post/', status: 301 },
    { from: '/docs/*', to: '/blog/:splat', status: 301 },
  ])
})

test('a Next-like build skips its error pages and falls back to sitemap.xml', async () => {
  const site = await readBuildFolder(fixture('next-like'))

  expect(site.pages.map((built) => built.path)).toEqual(['/', '/docs/'])
  expect(site.robots).toEqual({ sitemaps: [], disallow: ['/api/'] })
  expect(site.sitemap).toEqual({
    files: ['sitemap.xml'],
    urls: [
      'https://ledger.example/',
      'https://ledger.example/docs/',
      'https://ledger.example/docs/import/',
    ],
  })
  expect(site.redirects).toEqual([])
  expect(site.pages[1]?.facts.links.slice(0, 3)).toStrictEqual([
    { href: '/', selector: 'a.font-semibold', landmark: 'header' },
    { href: '/docs/', selector: 'a.block.py-1.text-sm', landmark: 'nav' },
    { href: '/docs/import/', selector: 'a.block.py-1.text-sm', landmark: 'nav' },
  ])
})

test('pages inside build internals, dot folders and error pages are not built pages', async () => {
  const root = await buildFolder({
    'about.html': page('About'),
    'docs/guide.html': page('Guide'),
    '500.html': page('Server error'),
    '500/index.html': page('Server error'),
    '_astro/chunk.html': page('Asset'),
    '_next/static/frame.html': page('Asset'),
    'node_modules/pkg/readme.html': page('Dependency'),
    '.well-known/security.html': page('Hidden'),
    'blog/_not-found/index.html': page('Not found'),
    'feed.xml': '<rss/>',
  })
  const site = await readBuildFolder(root)

  expect(site.pages.map((built) => [built.path, built.file])).toEqual([
    ['/about', 'about.html'],
    ['/docs/guide', 'docs/guide.html'],
  ])
  expect(site.sitemap).toBeUndefined()
  expect(site.robots).toBeUndefined()
  expect(site.redirects).toEqual([])
})

test('the sitemap reads each file once and skips entries outside the build', async () => {
  const root = await buildFolder({
    'index.html': page('Home'),
    'sitemap-index.xml': `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://site.example/sitemap-index.xml</loc></sitemap>
  <sitemap><loc> https://site.example/sitemaps/pages.xml </loc></sitemap>
  <sitemap><loc>https://cdn.example/elsewhere.xml</loc></sitemap>
</sitemapindex>`,
    'sitemaps/pages.xml': `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://site.example/?ref=a&amp;b=c</loc></url>
</urlset>`,
    'sitemap.xml': '<urlset><url><loc>https://site.example/ignored/</loc></url></urlset>',
  })
  const site = await readBuildFolder(root)

  expect(site.sitemap).toEqual({
    files: ['sitemap-index.xml', 'sitemaps/pages.xml'],
    urls: ['https://site.example/?ref=a&b=c'],
  })
})

test('a sitemap that robots.txt names but the build lacks leaves the site without one', async () => {
  const root = await buildFolder({
    'index.html': page('Home'),
    'robots.txt': 'User-agent: *\nSitemap: https://site.example/missing.xml\n',
    'sitemap.xml': '<urlset><url><loc>https://site.example/</loc></url></urlset>',
  })
  const site = await readBuildFolder(root)

  expect(site.robots?.sitemaps).toEqual(['https://site.example/missing.xml'])
  expect(site.sitemap).toBeUndefined()
})

test('a missing build folder is an error, not an empty site', async () => {
  await expect(readBuildFolder(join(tmpdir(), 'cb-built-site-missing'))).rejects.toMatchObject({
    code: 'ENOENT',
  })
})
