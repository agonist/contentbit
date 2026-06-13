import { expect, test } from 'vitest'

import { parseLinkFrontmatter } from './links.js'

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
