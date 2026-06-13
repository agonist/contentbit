import { expect, test } from 'vitest'

import { buildLinkIndex, parseLinkFrontmatter, serializeLinkIndex, validateLinks } from './links.js'

test('parses a full authored link frontmatter', () => {
  const r = parseLinkFrontmatter({
    slug: 'beginner-pizza-dough',
    linksTo: ['cold-fermentation-pizza'],
    aliases: ['intro-pizza-dough'],
    keywords: { primary: 'how to make pizza dough', secondary: ['easy dough'] },
    title: 'Beginner Pizza Dough',
  })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.value?.slug).toBe('beginner-pizza-dough')
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
