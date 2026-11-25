import { expect, test } from 'vitest'

import { createLinkGraphView } from './link-graph.js'
import { buildLinkIndex, parseLinkFrontmatter, serializeLinkIndex, validateLinks } from './links.js'
import { readContentPageFacts } from './page-facts.js'

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

test('reads title and keywords as page facts do, so other shapes keep the page linked', () => {
  const inputs = [
    { path: 'a.md', data: { slug: 'a', title: 2024, keywords: ['x', 'y'], linksTo: ['b'] } },
    { path: 'b.md', data: { slug: 'b', linksTo: ['a'] } },
  ]
  const facts = readContentPageFacts(inputs[0].data)

  expect(validateLinks(inputs)).toEqual([])
  const a = buildLinkIndex(inputs).pages.get('a')
  expect(a?.linkedFrom).toEqual(['b'])
  expect(a?.title).toEqual(facts.title)
  expect(a?.keywords).toEqual(facts.keywords)
})

test('a malformed linksTo is reported on its page, which stays a link target', () => {
  const inputs = [
    { path: 'a.md', data: { slug: 'a', linksTo: 'b' } },
    { path: 'b.md', data: { slug: 'b', linksTo: ['a', 'c'] } },
    { path: 'c.md', data: { slug: 'c', locale: 3 } },
  ]

  expect(validateLinks(inputs).map((r) => [r.file, r.diagnostic.code])).toEqual([
    ['a.md', 'CB_LINK_SHAPE'],
    ['c.md', 'CB_LINK_SHAPE'],
    ['b.md', 'CB_LINK_UNRESOLVED'],
    ['b.md', 'CB_LINK_ORPHAN'],
  ])
  const index = buildLinkIndex(inputs)
  expect(index.pages.get('a')?.linkedFrom).toEqual(['b'])
  expect(index.pages.get('a')?.linksTo).toEqual([])
  // A malformed identity leaves nothing to link to.
  expect(index.pages.has('c')).toBe(false)
})

test('a valid symmetric graph produces no errors', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'a', linksTo: ['b'] } },
    { path: 'b.md', data: { slug: 'b', linksTo: ['a'] } },
  ])
  expect(rows.filter((r) => r.diagnostic.severity === 'error')).toEqual([])
})

test('indexes and validates thousands of pages in linear time', () => {
  const size = 4000
  const inputs = Array.from({ length: size }, (_, i) => ({
    path: `p${i}.md`,
    data: { slug: `p${i}`, linksTo: [`p${(i + 1) % size}`] },
  }))

  const started = performance.now()
  const index = buildLinkIndex(inputs)
  const rows = validateLinks(inputs)
  const elapsed = performance.now() - started

  expect(index.pages.get('p0')?.linkedFrom).toEqual([`p${size - 1}`])
  expect(rows).toEqual([])
  // Linear work takes tens of milliseconds here; re-reading every input for
  // every page took seconds.
  expect(elapsed).toBeLessThan(1000)
})

test('indexes a page linked from every other page in linear time', () => {
  const size = 20000
  const inputs = Array.from({ length: size }, (_, i) => ({
    path: `p${i}.md`,
    data: { slug: `p${i}`, linksTo: ['hub', 'hub'] },
  }))
  inputs.push({ path: 'hub.md', data: { slug: 'hub', linksTo: [] } })

  const started = performance.now()
  const hub = buildLinkIndex(inputs).pages.get('hub')
  const elapsed = performance.now() - started

  expect(hub?.linkedFrom).toHaveLength(size)
  expect(hub?.linkedFrom[size - 1]).toBe(`p${size - 1}`)
  expect(hub?.linkedFromRefs).toHaveLength(size)
  // Checking each new inbound link against all earlier ones took seconds.
  expect(elapsed).toBeLessThan(500)
})

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    return state / 2 ** 32
  }
}

// Slugs as one site writes them: a few words from one topic, some in a
// numbered series.
function siteSlugs(count: number, random: () => number): string[] {
  const words = (
    'pizza dough cold fermentation sourdough starter bread flour yeast oven stone pan ' +
    'crust sauce tomato cheese basil olive oil garlic recipe guide easy quick overnight bake'
  ).split(' ')
  const slugs = new Set<string>()
  while (slugs.size < count) {
    const length = 1 + Math.floor(random() * 5)
    const slug = Array.from({ length }, () => words[Math.floor(random() * words.length)]).join('-')
    slugs.add(slug)
    if (random() < 0.3) for (const n of [2, 3]) slugs.add(`${slug}-${n}`)
  }
  return [...slugs]
}

// A link to a page of the site with a few typos, or to a page it lacks.
function brokenTarget(names: string[], random: () => number): string {
  if (random() < 0.3) return siteSlugs(1, random)[0]
  let target = names[Math.floor(random() * names.length)]
  for (let edits = 1 + Math.floor(random() * 4); edits > 0; edits--) {
    const at = Math.floor(random() * (target.length + 1))
    const letter = 'abcdefghijklmnopqrstuvwxyz-'[Math.floor(random() * 27)]
    const kind = Math.floor(random() * 3)
    target = target.slice(0, at) + (kind < 2 ? letter : '') + target.slice(kind === 1 ? at : at + 1)
  }
  return target
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = row
  }
  return previous[b.length]
}

test.each(['global-slug', 'same-locale-slug', 'same-locale-key'] as const)(
  'a did-you-mean hint names the first closest page in the link scope (%s)',
  (resolve) => {
    const random = seededRandom(3)
    const locales = resolve === 'global-slug' ? [undefined] : ['en', 'fr']
    const pages = siteSlugs(150, random).map((slug, i) => ({
      slug,
      locale: locales[i % locales.length],
      name: resolve === 'same-locale-key' ? `key-${slug}` : slug,
    }))
    const names = pages.map((page) => page.name)
    const inputs = pages.map((page, i) => ({
      path: `${i}.md`,
      data: {
        slug: page.slug,
        ...(page.locale ? { locale: page.locale } : {}),
        ...(resolve === 'same-locale-key' ? { key: page.name } : {}),
        linksTo: [brokenTarget(names, random), brokenTarget(names, random)],
      },
    }))

    // The first page in input order at the smallest edit distance, within a
    // third of the target's length (at least 2), among pages in its locale.
    const expectedHint = (target: string, locale: string | undefined) => {
      let best: string | undefined
      let bestDistance = Math.max(2, Math.floor(target.length / 3)) + 1
      for (const page of pages.filter((p) => p.locale === locale)) {
        const distance = editDistance(target, page.name)
        if (distance < bestDistance) [best, bestDistance] = [page.name, distance]
      }
      return best && `Did you mean "${best}"?`
    }
    const unresolved = validateLinks(inputs, { resolve }).filter(
      (r) => r.diagnostic.code === 'CB_LINK_UNRESOLVED',
    )
    const hints = unresolved.map((r) => r.diagnostic.hint)

    expect(hints).toEqual(
      unresolved.map((r) => expectedHint(r.target!, pages[Number.parseInt(r.file)].locale)),
    )
    expect(hints.filter(Boolean).length).toBeGreaterThan(100)
    expect(hints.filter((hint) => !hint).length).toBeGreaterThan(50)
  },
)

test('hints for a broken link on every one of a thousand pages', () => {
  const random = seededRandom(5)
  const slugs = siteSlugs(1000, random)
  const inputs = slugs.map((slug, i) => ({
    path: `${slug}.md`,
    data: { slug, linksTo: [slugs[(i + 1) % slugs.length], brokenTarget(slugs, random)] },
  }))

  const started = performance.now()
  const rows = validateLinks(inputs)
  const elapsed = performance.now() - started

  const unresolved = rows.filter((r) => r.diagnostic.code === 'CB_LINK_UNRESOLVED')
  expect(unresolved.length).toBeGreaterThan(900)
  expect(unresolved.filter((r) => r.diagnostic.hint).length).toBeGreaterThan(500)
  // Tens of milliseconds; a full edit-distance matrix against every page for
  // every broken link took seconds.
  expect(elapsed).toBeLessThan(1000)
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
