import { expect, test } from 'vitest'

import {
  checkSite,
  pagePath,
  type BuiltPage,
  type BuiltSite,
  type RenderedLink,
  type RenderedPageFacts,
} from '../index.js'

type PageFacts = Partial<Omit<RenderedPageFacts, 'links'>> & { links?: string[] }

/** A page that passes every check unless the test overrides a fact. */
function builtPage(path: string, facts: PageFacts = {}): BuiltPage {
  const { links = [], ...rest } = facts
  return {
    path: pagePath(path),
    file: path.endsWith('/') ? `${path.slice(1)}index.html` : `${path.slice(1)}.html`,
    facts: {
      title: `Title of ${path}`,
      description: `About ${path}`,
      canonical: path,
      robots: { noindex: false, nofollow: false },
      alternates: [],
      structuredData: [],
      headings: [{ level: 1, text: `Heading of ${path}` }],
      ids: [],
      images: [],
      textLength: 400,
      ...rest,
      links: links.map((href): RenderedLink => ({ href, selector: 'a' })),
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

function check(site: BuiltSite, options: Parameters<typeof checkSite>[1] = {}) {
  return checkSite(site, options).map(({ code, origin, message }) => ({
    code,
    page: origin.kind === 'template' ? origin.pages : origin.page,
    message,
  }))
}

const noindex = { robots: { noindex: true, nofollow: false } }

test('a site whose pages have their metadata, one h1 and working links has no findings', () => {
  const site = builtSite(
    [
      builtPage('/', { links: ['/blog/', '/blog/post/#intro', '#', 'mailto:hi@example.com'] }),
      builtPage('/blog/', { links: ['post/', '/old', '/guide.pdf', '/api/status'] }),
      builtPage('/blog/post/', {
        ids: ['intro'],
        images: [{ src: '/a.png', alt: '', selector: 'img' }],
      }),
    ],
    {
      files: ['index.html', 'blog/index.html', 'blog/post/index.html', 'guide.pdf'],
      redirects: [{ from: '/old', to: '/blog/', status: 301 }],
    },
  )

  expect(checkSite(site, { origin: 'https://example.com', hostRoutes: ['/api/status'] })).toEqual(
    [],
  )
})

test('a page with no headings and under 50 characters of text is reported as browser-rendered, and only that', () => {
  const site = builtSite([
    builtPage('/app/', {
      headings: [],
      textLength: 49,
      title: undefined,
      images: [{ src: '/x.png', selector: 'img' }],
    }),
    builtPage('/short/', { headings: [], textLength: 50 }),
    builtPage('/moved/', { headings: [], textLength: 12, redirect: '/short/', ...noindex }),
    builtPage('/hidden/', { headings: [], textLength: 0, ...noindex }),
  ])

  expect(check(site)).toEqual([
    {
      code: 'CB_PAGE_BROWSER_RENDERED',
      page: '/app/',
      message:
        "The HTML has no headings and 49 characters of text, so the page's content renders only in the browser.",
    },
    { code: 'CB_PAGE_BROWSER_RENDERED', page: '/hidden/', message: expect.any(String) },
    { code: 'CB_PAGE_H1_MISSING', page: '/short/', message: 'The page has no h1 heading.' },
  ])
})

test('an indexable page without a title, description or canonical gets one finding for each', () => {
  const site = builtSite([
    builtPage('/', { title: '', description: undefined, canonical: undefined }),
    builtPage('/private/', {
      title: undefined,
      description: undefined,
      canonical: undefined,
      ...noindex,
    }),
    builtPage('/moved/', { title: undefined, canonical: undefined, redirect: '/' }),
  ])

  expect(checkSite(site)).toEqual([
    {
      code: 'CB_PAGE_CANONICAL_MISSING',
      severity: 'warning',
      message: 'The page has no canonical URL.',
      hint: 'Add a <link rel="canonical"> with the URL of the page itself.',
      origin: { kind: 'page', page: '/' },
    },
    {
      code: 'CB_PAGE_DESCRIPTION_MISSING',
      severity: 'warning',
      message: 'The page has no meta description.',
      hint: 'Add a <meta name="description"> that sums up the page in a sentence or two.',
      origin: { kind: 'page', page: '/' },
    },
    {
      code: 'CB_PAGE_TITLE_MISSING',
      severity: 'error',
      message: 'The page has no title.',
      hint: 'Add a <title> that says what the page is about.',
      origin: { kind: 'page', page: '/' },
    },
  ])
})

test('a canonical that resolves to another built page points elsewhere; one to the page itself does not', () => {
  const site = builtSite([
    builtPage('/a/', { canonical: 'https://example.com/b/' }),
    builtPage('/b/', { canonical: 'https://example.com/b' }),
    builtPage('/c/', { canonical: '../c/?utm=x' }),
    builtPage('/d/', { canonical: '/gone/' }),
    builtPage('/e/', { canonical: '/b/', ...noindex }),
  ])

  expect(check(site, { origin: 'https://example.com' })).toEqual([
    {
      code: 'CB_PAGE_CANONICAL_ELSEWHERE',
      page: '/a/',
      message:
        'The canonical URL points to /b/, so search engines index that page instead of this one.',
    },
  ])
})

test('an absolute canonical on another origin is reported when the site origin is known', () => {
  const site = builtSite([
    builtPage('/', { canonical: 'https://example.com/' }),
    builtPage('/a/', { canonical: 'https://staging.example.com/a/' }),
    builtPage('/b/', { canonical: 'http://example.com/b/' }),
  ])

  expect(check(site, { origin: 'https://example.com' })).toEqual([
    {
      code: 'CB_PAGE_CANONICAL_ORIGIN',
      page: '/a/',
      message:
        'The canonical URL https://staging.example.com/a/ is on https://staging.example.com, not on the site origin https://example.com.',
    },
    { code: 'CB_PAGE_CANONICAL_ORIGIN', page: '/b/', message: expect.any(String) },
  ])
  expect(check(site)).toEqual([])
})

test('pages that share a title get one finding each, naming the count and up to three others', () => {
  const site = builtSite([
    builtPage('/', { title: 'Fond' }),
    builtPage('/a/', { title: 'fond' }),
    builtPage('/b/', { title: 'Fond' }),
    builtPage('/c/', { title: 'Fond' }),
    builtPage('/d/', { title: 'Fond' }),
    builtPage('/copy/', { title: 'Fond', canonical: '/' }),
    builtPage('/hidden/', { title: 'Fond', ...noindex }),
    builtPage('/x/', { title: 'Pair' }),
    builtPage('/y/', { title: 'Pair' }),
  ])

  const titles = check(site).filter(({ code }) => code === 'CB_PAGE_TITLE_DUPLICATE')
  expect(titles.map(({ page }) => page)).toEqual(['/', '/a/', '/b/', '/c/', '/d/', '/x/', '/y/'])
  expect(titles[0].message).toBe(
    '5 pages share the title "Fond": this one, /a/, /b/, /c/ and 1 more.',
  )
  expect(titles[1].message).toBe(
    '5 pages share the title "fond": this one, /, /b/, /c/ and 1 more.',
  )
  expect(titles[5].message).toBe('2 pages share the title "Pair": this one and /y/.')
})

test('pages that share a description are reported the same way', () => {
  const site = builtSite([
    builtPage('/a/', { description: 'Recipes.' }),
    builtPage('/b/', { description: 'Recipes.' }),
    builtPage('/c/', { description: 'Recipes.' }),
  ])

  expect(check(site)).toEqual([
    {
      code: 'CB_PAGE_DESCRIPTION_DUPLICATE',
      page: '/a/',
      message: '3 pages share the description "Recipes.": this one, /b/ and /c/.',
    },
    { code: 'CB_PAGE_DESCRIPTION_DUPLICATE', page: '/b/', message: expect.any(String) },
    { code: 'CB_PAGE_DESCRIPTION_DUPLICATE', page: '/c/', message: expect.any(String) },
  ])
})

test('an indexable page needs exactly one h1', () => {
  const site = builtSite([
    builtPage('/none/', { headings: [{ level: 2, text: 'Section' }] }),
    builtPage('/two/', {
      headings: [
        { level: 1, text: 'Fond' },
        { level: 2, text: 'Section' },
        { level: 1, text: 'Recipes' },
      ],
    }),
    builtPage('/hidden/', { headings: [{ level: 2, text: 'Section' }], ...noindex }),
  ])

  expect(check(site)).toEqual([
    { code: 'CB_PAGE_H1_MISSING', page: '/none/', message: 'The page has no h1 heading.' },
    {
      code: 'CB_PAGE_H1_MULTIPLE',
      page: '/two/',
      message: 'The page has 2 h1 headings: "Fond" and "Recipes".',
    },
  ])
})

test('images without an alt attribute give one finding per page, counting each source once', () => {
  const img = (src?: string, alt?: string) => ({
    ...(src !== undefined && { src }),
    ...(alt !== undefined && { alt }),
    selector: 'img',
  })
  const site = builtSite([
    builtPage('/a/', {
      images: [
        img('/1.png'),
        img('/2.png'),
        img('/1.png'),
        img('/3.png'),
        img(),
        img('/4.png'),
        img('/d.png', ''),
      ],
    }),
    builtPage('/b/', { images: [img('/1.png'), img('/2.png', 'A chart')] }),
    builtPage('/hidden/', { images: [img('/1.png')], ...noindex }),
    builtPage('/app/', { headings: [], textLength: 0, images: [img('/1.png')] }),
  ])

  expect(check(site).filter(({ code }) => code === 'CB_PAGE_IMAGE_ALT_MISSING')).toEqual([
    {
      code: 'CB_PAGE_IMAGE_ALT_MISSING',
      page: '/a/',
      message: '5 images have no alt attribute: /1.png, /2.png, /3.png and 2 more.',
    },
    {
      code: 'CB_PAGE_IMAGE_ALT_MISSING',
      page: '/b/',
      message: '1 image has no alt attribute: /1.png.',
    },
    { code: 'CB_PAGE_IMAGE_ALT_MISSING', page: '/hidden/', message: expect.any(String) },
  ])
})

test('each invalid JSON-LD block is an error with its parse error', () => {
  const site = builtSite([
    builtPage('/', {
      structuredData: [
        { valid: true, types: ['WebSite'] },
        { valid: false, error: "Expected ',' or '}' after property value in JSON at position 40" },
        { valid: false, error: 'JSON-LD must be an object or an array.' },
      ],
    }),
  ])

  expect(
    checkSite(site).map(({ code, severity, message }) => ({ code, severity, message })),
  ).toEqual([
    {
      code: 'CB_PAGE_STRUCTURED_DATA_INVALID',
      severity: 'error',
      message:
        "JSON-LD block 2 is invalid: Expected ',' or '}' after property value in JSON at position 40.",
    },
    {
      code: 'CB_PAGE_STRUCTURED_DATA_INVALID',
      severity: 'error',
      message: 'JSON-LD block 3 is invalid: JSON-LD must be an object or an array.',
    },
  ])
})

test('broken links give one finding per distinct href on each page', () => {
  const site = builtSite(
    [
      builtPage('/', {
        links: [
          '/nowhere/',
          '/nowhere/',
          '/nowhere',
          '#missing',
          '#missing',
          '/post/#gone',
          '/post/#intro',
          '/report.pdf',
          '/guide.pdf',
          '/old/#anything',
          '/api/live',
          'https://other.example/nowhere/',
        ],
      }),
      builtPage('/post/', { ids: ['intro'], links: ['/nowhere/'] }),
    ],
    {
      files: ['index.html', 'post/index.html', 'guide.pdf'],
      redirects: [{ from: '/old/*', to: '/', status: 301 }],
    },
  )

  expect(check(site, { origin: 'https://example.com', hostRoutes: ['/api/live'] })).toEqual([
    {
      code: 'CB_LINK_ANCHOR_MISSING',
      page: '/',
      message: 'The link #missing points to an id that this page does not have.',
    },
    {
      code: 'CB_LINK_ANCHOR_MISSING',
      page: '/',
      message: 'The link /post/#gone points to an id that /post/ does not have.',
    },
    {
      code: 'CB_LINK_FILE_MISSING',
      page: '/',
      message: 'The link /report.pdf points to a file that is not in the build.',
    },
    {
      code: 'CB_LINK_PAGE_MISSING',
      page: '/',
      message: 'The link /nowhere/ points to no built page, redirect or host route.',
    },
    {
      code: 'CB_LINK_PAGE_MISSING',
      page: '/',
      message: 'The link /nowhere points to no built page, redirect or host route.',
    },
    { code: 'CB_LINK_PAGE_MISSING', page: '/post/', message: expect.any(String) },
  ])
})

test('a link from an indexable page to a noindex page is reported; links between noindex pages are not', () => {
  const site = builtSite([
    builtPage('/', { links: ['/private/', '/private/#form', '/fr/private/'] }),
    builtPage('/private/', {
      ids: ['form'],
      links: ['#form', '/private/', '/fr/private/'],
      ...noindex,
    }),
    builtPage('/fr/private/', { links: ['/private/'], ...noindex }),
  ])

  expect(check(site)).toEqual([
    {
      code: 'CB_LINK_NOINDEX_TARGET',
      page: '/',
      message: 'The link /private/ points to /private/, a page marked noindex.',
    },
    {
      code: 'CB_LINK_NOINDEX_TARGET',
      page: '/',
      message: expect.stringContaining('/private/#form'),
    },
    { code: 'CB_LINK_NOINDEX_TARGET', page: '/', message: expect.stringContaining('/fr/private/') },
  ])
})

test('findings come sorted by page path, then code', () => {
  const site = builtSite([
    builtPage('/a/', { headings: [{ level: 2, text: 'x' }], description: undefined }),
    builtPage('/b/', { title: 'Shared', links: ['/gone/'] }),
    builtPage('/c/', { title: 'Shared' }),
  ])

  expect(check(site).map(({ page, code }) => `${page} ${code}`)).toEqual([
    '/a/ CB_PAGE_DESCRIPTION_MISSING',
    '/a/ CB_PAGE_H1_MISSING',
    '/b/ CB_LINK_PAGE_MISSING',
    '/b/ CB_PAGE_TITLE_DUPLICATE',
    '/c/ CB_PAGE_TITLE_DUPLICATE',
  ])
})
