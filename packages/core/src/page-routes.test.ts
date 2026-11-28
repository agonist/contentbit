import { expect, test } from 'vitest'

import { contentPageUrlResolver } from './page-routes.js'

test('routes fill page facts, and a page without the fact or outside every route has no URL', () => {
  const pageUrl = contentPageUrlResolver({
    defaultLocale: 'en',
    routes: { '/content/guides': '/{locale}/guides/{slug}', '/content': '/{path}' },
  })

  expect(pageUrl?.('/content/guides/a.md', { locale: 'fr', slug: 'bonjour' })).toBe(
    '/fr/guides/bonjour',
  )
  expect(pageUrl?.('/content/guides/b.md', { slug: 'hello' })).toBe('/en/guides/hello')
  expect(pageUrl?.('/content/guides/c.md', {})).toBeUndefined()
  expect(pageUrl?.('/content/docs/index.mdx', {})).toBe('/docs')
  expect(pageUrl?.('/elsewhere/d.md', {})).toBeUndefined()
})

test('routes reject unknown placeholders', () => {
  expect(() => contentPageUrlResolver({ routes: { '/content': '/{slg}' } })).toThrow('{slg}')
})

test('without routes there is no lookup', () => {
  expect(contentPageUrlResolver({})).toBeUndefined()
})
