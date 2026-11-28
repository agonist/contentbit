import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

import { readRenderedPageFacts } from './index.js'

const fixture = (file: string) =>
  readFile(fileURLToPath(new URL(`../fixtures/${file}`, import.meta.url)), 'utf8')

describe('an Astro-like blog post', async () => {
  const facts = readRenderedPageFacts(await fixture('astro-like/blog/first-post/index.html'))

  test('reads the head with entities decoded and the title whitespace collapsed', () => {
    expect(facts.lang).toBe('en')
    expect(facts.title).toBe("Shipping a static site: what works & what doesn't | Harbor Notes")
    expect(facts.description).toBe(
      'What a static build gets right, and the parts that still need care.',
    )
    expect(facts.canonical).toBe('https://harbor.example/blog/first-post/')
    expect(facts.robots).toEqual({ noindex: false, nofollow: false })
    expect(facts.redirect).toBeUndefined()
  })

  test('reads hreflang alternates and ignores alternates without hreflang', () => {
    expect(facts.alternates).toEqual([
      { hreflang: 'en', href: 'https://harbor.example/blog/first-post/' },
      { hreflang: 'fr', href: 'https://harbor.example/fr/blog/first-post/' },
      { hreflang: 'x-default', href: 'https://harbor.example/blog/first-post/' },
    ])
  })

  test('lists every @type in a JSON-LD @graph, nested ones included', () => {
    expect(facts.structuredData).toEqual([
      { valid: true, types: ['BlogPosting', 'Person', 'BreadcrumbList', 'ListItem'] },
    ])
  })

  test('decodes heading text and keeps heading ids exactly as the template wrote them', () => {
    expect(facts.headings).toStrictEqual([
      { level: 1, text: 'Shipping a static site' },
      { level: 2, text: 'Why static', id: 'why-static' },
      { level: 2, text: 'Choosing a host', id: 'choosing-a-host' },
      { level: 3, text: 'Cache headers', id: 'cache-headers' },
      { level: 2, text: "What doesn't work", id: 'what-doesn39t-work' },
    ])
    expect(facts.ids).toEqual([
      'why-static',
      'choosing-a-host',
      'cache-headers',
      'what-doesn39t-work',
    ])
  })

  test('gives each link its selector and landmark', () => {
    expect(facts.links).toStrictEqual([
      { href: '/', selector: 'a.brand', landmark: 'nav' },
      { href: '/blog/first-post/', selector: 'a.nav-link.active', landmark: 'nav' },
      { href: '#why-static', selector: 'a.toc-link', landmark: 'nav' },
      { href: '#choosing-a-host', selector: 'a.toc-link', landmark: 'nav' },
      { href: '#what-doesnt-work', selector: 'a.toc-link', landmark: 'nav' },
      {
        href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching',
        rel: 'noopener noreferrer',
        selector: 'a',
        landmark: 'main',
      },
      { href: '/fr/blog/first-post/#ce-qui-ne-marche-pas', selector: 'a', landmark: 'main' },
      { href: '/', selector: 'a.related-link', landmark: 'aside' },
      { href: '/fr/blog/first-post/', selector: 'a.lang-link', landmark: 'footer' },
    ])
  })

  test('tells an image with no alt attribute from a decorative one', () => {
    expect(facts.images).toStrictEqual([
      {
        src: '/_astro/harbor.Dq81kLmz_Z1xYq0.webp',
        alt: 'A harbor at dawn',
        selector: 'img.post-cover',
        landmark: 'main',
      },
      { src: '/_astro/divider.svg', alt: '', selector: 'img.divider', landmark: 'main' },
      { src: '/_astro/build-times.B7cq2Lp1.webp', selector: 'img.figure-image', landmark: 'main' },
    ])
  })
})

test('a landmark ends where its element closes, even when the close is implied', () => {
  const facts = readRenderedPageFacts(
    '<body><nav><ul><li><a href="/a">A</nav><div role="contentinfo"><a href="/b">B</a></div><a href="/c">C</a></body>',
  )
  expect(facts.links).toStrictEqual([
    { href: '/a', selector: 'a', landmark: 'nav' },
    { href: '/b', selector: 'a', landmark: 'footer' },
    { href: '/c', selector: 'a' },
  ])
})

test('textLength counts collapsed visible text and skips head, script, style, template and noscript', () => {
  const facts =
    readRenderedPageFacts(`<html><head><title>Not counted</title><style>p{}</style></head>
<body>
  <p>Hello,
     world</p>
  <script>window.counted = false</script><style>.x{}</style>
  <template><p>Not counted</p></template><noscript>Not counted</noscript>
  <p>Caf&eacute;</p>
</body></html>`)
  expect(facts.textLength).toBe('Hello, world Café'.length)
})

test('textLength counts text on a page whose optional head and body tags are left out', () => {
  const facts = readRenderedPageFacts('<!doctype html><title>Short</title><p>Only this')
  expect(facts.title).toBe('Short')
  expect(facts.textLength).toBe('Only this'.length)
})

test('the title is the first title outside svg', () => {
  const facts = readRenderedPageFacts(
    '<body><svg><title>Icon</title></svg><title>Late title</title><title>Second</title></body>',
  )
  expect(facts.title).toBe('Late title')
  expect(readRenderedPageFacts('<svg><title>Icon</title></svg>').title).toBeUndefined()
})

test('robots directives come from the robots and googlebot meta tags', () => {
  const read = (html: string) => readRenderedPageFacts(html).robots
  expect(read('<meta name="robots" content="noindex, follow">')).toEqual({
    noindex: true,
    nofollow: false,
  })
  expect(read('<meta name="GoogleBot" content="NOFOLLOW">')).toEqual({
    noindex: false,
    nofollow: true,
  })
  expect(read('<meta name="robots" content="none">')).toEqual({ noindex: true, nofollow: true })
  expect(read('<meta name="bingbot" content="noindex">')).toEqual({
    noindex: false,
    nofollow: false,
  })
})

test('a meta refresh gives the redirect target', () => {
  const read = (content: string) =>
    readRenderedPageFacts(`<meta http-equiv="refresh" content="${content}">`).redirect
  expect(read('0;url=/docs/')).toBe('/docs/')
  expect(read("1; URL='https://ledger.example/docs/'")).toBe('https://ledger.example/docs/')
  expect(read('0;url=/search?q=a&amp;b=c')).toBe('/search?q=a&b=c')
  expect(read('30')).toBeUndefined()
})

test('invalid JSON-LD becomes an invalid block instead of an error', () => {
  const facts = readRenderedPageFacts(`
    <script type="application/ld+json">{"@type": "Article",}</script>
    <script type="application/ld+json">"just a string"</script>
    <script type="application/ld+json">[{"@type": ["WebSite", "WebPage"]}, {"@type": "Organization"}]</script>
    <script type="application/json">{"not": "structured data"}</script>`)
  expect(facts.structuredData).toEqual([
    { valid: false, error: expect.any(String) },
    { valid: false, error: expect.any(String) },
    { valid: true, types: ['WebSite', 'WebPage', 'Organization'] },
  ])
})

test('ids are listed once each, in document order', () => {
  const facts = readRenderedPageFacts(
    '<h2 id="a">A</h2><p id="b"></p><span id="a"></span><i id=""></i>',
  )
  expect(facts.ids).toEqual(['a', 'b'])
})

test('malformed HTML still yields the facts it contains', () => {
  const facts = readRenderedPageFacts(
    '<html lang="en"><title>Broken</title><main></div></span><a href="/x" class="one  two ">X<h2 id="cut">Cut <b>off',
  )
  expect(facts.lang).toBe('en')
  expect(facts.title).toBe('Broken')
  expect(facts.links).toStrictEqual([{ href: '/x', selector: 'a.one.two', landmark: 'main' }])
  expect(facts.headings).toStrictEqual([{ level: 2, text: 'Cut off', id: 'cut' }])
  expect(readRenderedPageFacts('<h2>Cut <b class="unterminated').headings).toStrictEqual([
    { level: 2, text: 'Cut' },
  ])
})

test('tags and roles named like object properties are neither headings nor landmarks', () => {
  const facts = readRenderedPageFacts(
    '<constructor>x</constructor><div role="constructor"><a href="/y">y</a></div>',
  )
  expect(facts.headings).toEqual([])
  expect(facts.links).toStrictEqual([{ href: '/y', selector: 'a' }])
})
