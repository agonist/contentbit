import { expect, test } from 'vitest'

import { createLinkGraphView } from './link-graph.js'
import { buildLinkIndex, parseLinkFrontmatter, serializeLinkIndex, validateLinks } from './links.js'

test('parses a full authored link frontmatter', () => {
  const r = parseLinkFrontmatter({
    slug: 'beginner-pizza-dough',
    locale: 'en',
    key: 'pizza-dough',
    linksTo: ['cold-fermentation-pizza'],
    aliases: ['intro-pizza-dough'],
    keywords: { primary: 'how to make pizza dough', secondary: ['easy dough'] },
    title: 'Beginner Pizza Dough',
  })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.value?.slug).toBe('beginner-pizza-dough')
    expect(r.value?.locale).toBe('en')
    expect(r.value?.key).toBe('pizza-dough')
    expect(r.value?.linksTo).toEqual(['cold-fermentation-pizza'])
  }
})

test('a file with no slug is a non-participating page', () => {
  const r = parseLinkFrontmatter({ title: 'Just prose' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.value).toBeNull()
})

test('rejects a non-array linksTo', () => {
  const r = parseLinkFrontmatter({ slug: 'a', linksTo: 'b' })
  expect(r.ok).toBe(false)
})

test('derives linkedFrom and resolves aliases in linksTo', () => {
  const index = buildLinkIndex([
    { path: 'a.md', data: { slug: 'a', linksTo: ['old-b'] } },
    { path: 'b.md', data: { slug: 'b', aliases: ['old-b'], linksTo: ['a'] } },
  ])
  const a = index.pages.get('a')
  const b = index.pages.get('b')
  expect(a?.linksTo).toEqual(['b']) // old-b resolved to current slug b
  expect(b?.linkedFrom).toEqual(['a'])
  expect(a?.linkedFrom).toEqual(['b'])
  expect(index.aliases.get('old-b')).toBe('b')
})

test('skips files without a slug', () => {
  const index = buildLinkIndex([{ path: 'x.md', data: { title: 'no slug' } }])
  expect(index.pages.size).toBe(0)
})

function codes(rows: { diagnostic: { code: string } }[]): string[] {
  return rows.map((r) => r.diagnostic.code).sort()
}

test('errors on a dangling linksTo with a did-you-mean hint', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'a', linksTo: ['beginer'] } },
    { path: 'b.md', data: { slug: 'beginner' } },
  ])
  const unresolved = rows.find((r) => r.diagnostic.code === 'CB_LINK_UNRESOLVED')
  expect(unresolved).toBeTruthy()
  expect(unresolved?.diagnostic.severity).toBe('error')
  expect(unresolved?.diagnostic.hint).toContain('beginner')
})

test('errors on duplicate slugs', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'dup' } },
    { path: 'b.md', data: { slug: 'dup' } },
  ])
  expect(codes(rows)).toContain('CB_SLUG_DUPLICATE')
})

test('warns on orphan and self-link', () => {
  const rows = validateLinks([{ path: 'a.md', data: { slug: 'a', linksTo: ['a'] } }])
  expect(codes(rows)).toContain('CB_LINK_SELF')
  // 'a' links only to itself; nobody else links to it => orphan
  expect(codes(rows)).toContain('CB_LINK_ORPHAN')
})

test('reports shape errors as CB_LINK_SHAPE', () => {
  const rows = validateLinks([{ path: 'a.md', data: { slug: 'a', linksTo: 'b' } }])
  expect(codes(rows)).toContain('CB_LINK_SHAPE')
})

test('a valid symmetric graph produces no errors', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'a', linksTo: ['b'] } },
    { path: 'b.md', data: { slug: 'b', linksTo: ['a'] } },
  ])
  expect(rows.filter((r) => r.diagnostic.severity === 'error')).toEqual([])
})

test('serializes to a stable sorted plain object', () => {
  const index = buildLinkIndex([
    { path: 'b.md', data: { slug: 'b', linksTo: ['a'] } },
    { path: 'a.md', data: { slug: 'a' } },
  ])
  const json = serializeLinkIndex(index)
  expect(json.pages.map((p) => p.slug)).toEqual(['a', 'b']) // sorted
  expect(json.pages[0].linkedFrom).toEqual(['b'])
})

test('same-locale-slug resolves duplicate localized slugs independently', () => {
  const inputs = [
    { path: 'en-a.md', data: { locale: 'en', slug: 'pizza', linksTo: ['cold'] } },
    { path: 'en-b.md', data: { locale: 'en', slug: 'cold', linksTo: ['pizza'] } },
    { path: 'fr-a.md', data: { locale: 'fr', slug: 'pizza', linksTo: ['froid'] } },
    { path: 'fr-b.md', data: { locale: 'fr', slug: 'froid', linksTo: ['pizza'] } },
  ]
  const rows = validateLinks(inputs, { resolve: 'same-locale-slug' })
  expect(rows.filter((r) => r.diagnostic.severity === 'error')).toEqual([])
  const json = serializeLinkIndex(buildLinkIndex(inputs, { resolve: 'same-locale-slug' }))
  const fr = json.pages.find((p) => p.locale === 'fr' && p.slug === 'pizza')
  expect(fr?.linksTo).toEqual([{ target: 'froid', locale: 'fr', slug: 'froid' }])
})

test('same-locale-slug reports targets that only exist in another locale', () => {
  const rows = validateLinks(
    [
      { path: 'fr-a.md', data: { locale: 'fr', slug: 'pizza', linksTo: ['cold'] } },
      { path: 'en-b.md', data: { locale: 'en', slug: 'cold' } },
    ],
    { resolve: 'same-locale-slug' },
  )
  expect(codes(rows)).toContain('CB_LINK_LOCALE_MISSING')
})

test('same-locale-key resolves stable keys to localized slugs', () => {
  const inputs = [
    {
      path: 'fr-a.md',
      data: {
        locale: 'fr',
        slug: 'pate-a-pizza',
        key: 'pizza-dough',
        linksTo: ['cold-fermentation'],
      },
    },
    {
      path: 'fr-b.md',
      data: {
        locale: 'fr',
        slug: 'fermentation-a-froid',
        key: 'cold-fermentation',
        linksTo: ['pizza-dough'],
      },
    },
  ]
  const rows = validateLinks(inputs, { resolve: 'same-locale-key' })
  expect(rows.filter((r) => r.diagnostic.severity === 'error')).toEqual([])
  const json = serializeLinkIndex(buildLinkIndex(inputs, { resolve: 'same-locale-key' }))
  const fr = json.pages.find((p) => p.slug === 'pate-a-pizza')
  expect(fr?.linksTo).toEqual([
    {
      target: 'cold-fermentation',
      locale: 'fr',
      slug: 'fermentation-a-froid',
      key: 'cold-fermentation',
    },
  ])
})

test('same-locale-key resolves prefixed stable keys in the same locale', () => {
  const inputs = [
    {
      path: 'content/blog/how-to-season-cast-iron/fr.md',
      data: {
        locale: 'fr',
        slug: 'how-to-season-cast-iron',
        key: 'blog/how-to-season-cast-iron',
        linksTo: ['blog/cooking-oil-smoke-points', 'glossary/cast-iron-skillet'],
      },
    },
    {
      path: 'content/blog/cooking-oil-smoke-points/fr.md',
      data: {
        locale: 'fr',
        slug: 'cooking-oil-smoke-points',
        key: 'blog/cooking-oil-smoke-points',
        linksTo: ['blog/how-to-season-cast-iron'],
      },
    },
    {
      path: 'content/glossary/cast-iron-skillet/fr.md',
      data: {
        locale: 'fr',
        slug: 'cast-iron-skillet',
        key: 'glossary/cast-iron-skillet',
        linksTo: ['blog/how-to-season-cast-iron'],
      },
    },
    {
      path: 'content/blog/cooking-oil-smoke-points/en.md',
      data: {
        locale: 'en',
        slug: 'cooking-oil-smoke-points',
        key: 'blog/cooking-oil-smoke-points',
      },
    },
  ]

  const rows = validateLinks(inputs, { resolve: 'same-locale-key' })
  expect(rows.filter((r) => r.diagnostic.severity === 'error')).toEqual([])

  const json = serializeLinkIndex(buildLinkIndex(inputs, { resolve: 'same-locale-key' }))
  const fr = json.pages.find((p) => p.locale === 'fr' && p.slug === 'how-to-season-cast-iron')
  expect(fr?.linksTo).toEqual([
    {
      target: 'blog/cooking-oil-smoke-points',
      locale: 'fr',
      slug: 'cooking-oil-smoke-points',
      key: 'blog/cooking-oil-smoke-points',
    },
    {
      target: 'glossary/cast-iron-skillet',
      locale: 'fr',
      slug: 'cast-iron-skillet',
      key: 'glossary/cast-iron-skillet',
    },
  ])
})

test('normalizes seoKeywords into link index keyword data', () => {
  const json = serializeLinkIndex(
    buildLinkIndex([
      {
        path: 'oil.md',
        data: {
          slug: 'cooking-oil-smoke-points',
          seoKeywords: {
            primary: 'cooking oil smoke points',
            secondary: ['oil smoke point chart'],
            lsi: ['avocado oil smoke point'],
          },
        },
      },
    ]),
  )

  expect(json.pages[0].keywords).toEqual({
    primary: 'cooking oil smoke points',
    secondary: ['oil smoke point chart'],
    lsi: ['avocado oil smoke point'],
  })
})

test('duplicate global identities do not cascade unresolved diagnostics', () => {
  const rows = validateLinks([
    {
      path: 'content/blog/how-to-season-cast-iron/en.md',
      data: {
        locale: 'en',
        slug: 'how-to-season-cast-iron',
        key: 'blog/how-to-season-cast-iron',
        linksTo: ['blog/cooking-oil-smoke-points'],
      },
    },
    {
      path: 'content/blog/how-to-season-cast-iron/fr.md',
      data: {
        locale: 'fr',
        slug: 'how-to-season-cast-iron',
        key: 'blog/how-to-season-cast-iron',
        linksTo: ['blog/cooking-oil-smoke-points'],
      },
    },
    {
      path: 'content/blog/how-to-season-cast-iron/es.md',
      data: {
        locale: 'es',
        slug: 'how-to-season-cast-iron',
        key: 'blog/how-to-season-cast-iron',
        linksTo: ['blog/cooking-oil-smoke-points'],
      },
    },
  ])

  expect(codes(rows)).toContain('CB_SLUG_DUPLICATE')
  expect(codes(rows)).toContain('CB_KEY_DUPLICATE')
  expect(rows.filter((r) => r.diagnostic.code === 'CB_LINK_UNRESOLVED')).toEqual([])
  expect(rows.filter((r) => r.diagnostic.code === 'CB_LINK_ORPHAN')).toEqual([])
})

test('explicit object targets can resolve cross-locale links', () => {
  const rows = validateLinks(
    [
      {
        path: 'fr-a.md',
        data: {
          locale: 'fr',
          slug: 'pate-a-pizza',
          linksTo: [{ locale: 'en', slug: 'pizza-dough' }],
        },
      },
      { path: 'en-a.md', data: { locale: 'en', slug: 'pizza-dough' } },
    ],
    { resolve: 'same-locale-slug' },
  )
  expect(codes(rows)).toContain('CB_LINK_CROSS_LOCALE')
})

test('link graph view exposes summary and unresolved edges from structured diagnostics', () => {
  const inputs = [
    { path: 'a.md', data: { slug: 'alpha', linksTo: ['beta', 'missing'] } },
    { path: 'b.md', data: { slug: 'beta', linksTo: ['alpha'] } },
  ]
  const diagnostics = validateLinks(inputs)
  const view = createLinkGraphView(buildLinkIndex(inputs), diagnostics)

  expect(view.summary).toEqual({ pages: 2, links: 3, orphans: 0 })
  expect(view.edges).toContainEqual({
    from: '\0alpha',
    to: '\0beta',
    target: 'beta',
    status: 'resolved',
  })
  expect(view.edges).toContainEqual({
    from: '\0alpha',
    target: 'missing',
    status: 'unresolved',
  })
})
