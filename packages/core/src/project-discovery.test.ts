import { expect, test } from 'vitest'

import { analyzeDocument } from './analyze.js'
import { discoverContentProject, type DiscoveredContentProjectPage } from './project-discovery.js'

function file(path: string, source: string, frontmatter: Record<string, unknown> = {}) {
  return { path, frontmatter, stats: analyzeDocument(source) }
}

function pageByPath(
  pages: DiscoveredContentProjectPage[],
  path: string,
): DiscoveredContentProjectPage {
  const page = pages.find((candidate) => candidate.path === path)
  if (!page) throw new Error(`Missing discovered page: ${path}`)
  return page
}

test('project paths and fallback identities are portable relative to the repository root', () => {
  const discovery = discoverContentProject([file('/repo/content/blog/hello.md', '# Hello')], {
    root: '/repo',
  })

  expect(discovery.pages[0]).toMatchObject({
    sourcePath: '/repo/content/blog/hello.md',
    path: 'content/blog/hello.md',
    facts: {
      identity: { value: 'content/blog/hello.md', source: 'path', confidence: 'exact' },
    },
  })
})

test('repeated directories become likely page families while isolated directories remain unknown', () => {
  const discovery = discoverContentProject(
    [
      file('/repo/content/blog/one.md', '# One'),
      file('/repo/content/blog/two.md', '# Two'),
      file('/repo/content/glossary/term.md', '# Term'),
    ],
    { root: '/repo' },
  )

  expect(pageByPath(discovery.pages, 'content/blog/one.md').facts.family).toEqual({
    value: 'blog',
    source: 'path',
    confidence: 'likely',
  })
  expect(pageByPath(discovery.pages, 'content/glossary/term.md').facts.family).toBeUndefined()
  expect(discovery.families).toEqual([{ id: 'blog', files: 2 }])
})

test('authored page types remain exact page families even for one file', () => {
  const discovery = discoverContentProject(
    [file('/repo/content/custom.md', '# Custom', { type: 'landing' })],
    { root: '/repo' },
  )

  expect(discovery.pages[0].facts.family).toEqual({
    value: 'landing',
    source: 'frontmatter',
    confidence: 'exact',
  })
  expect(discovery.families).toEqual([{ id: 'landing', files: 1 }])
})

test('repeated locale sibling paths infer likely locales and preserve the family directory', () => {
  const discovery = discoverContentProject(
    [
      file('/repo/content/en/guides/start.md', '# Start'),
      file('/repo/content/fr/guides/start.md', '# Commencer'),
      file('/repo/content/en/guides/next.md', '# Next'),
      file('/repo/content/fr/guides/next.md', '# Suivant'),
      file('/repo/content/ui/standalone.md', '# Standalone UI page'),
    ],
    { root: '/repo' },
  )

  expect(pageByPath(discovery.pages, 'content/en/guides/start.md').facts).toMatchObject({
    locale: { value: 'en', source: 'path', confidence: 'likely' },
    family: { value: 'guides', source: 'path', confidence: 'likely' },
  })
  expect(pageByPath(discovery.pages, 'content/fr/guides/start.md').facts.locale).toEqual({
    value: 'fr',
    source: 'path',
    confidence: 'likely',
  })
  expect(discovery.locales).toEqual([
    { id: 'en', files: 2 },
    { id: 'fr', files: 2 },
  ])
  expect(discovery.families).toEqual([{ id: 'guides', files: 4 }])
  expect(pageByPath(discovery.pages, 'content/ui/standalone.md').facts.locale).toBeUndefined()
})

test('a single matching path is not enough to infer locale directories', () => {
  const discovery = discoverContentProject(
    [
      file('/repo/content/ui/button.md', '# Button'),
      file('/repo/content/db/button.md', '# Button query'),
    ],
    { root: '/repo' },
  )

  expect(discovery.locales).toEqual([])
  expect(discovery.pages.every((page) => page.facts.locale === undefined)).toBe(true)
})

test.each([
  ['/repo/app', '/repo/shared'],
  ['/elsewhere/app', '/elsewhere/shared'],
  ['C:\\checkout\\app', 'C:\\checkout\\shared'],
  ['//server/share/app', '//server/share/shared'],
  [undefined, '/machine/content'],
  [undefined, '../shared'],
])('outside-root paths do not supply guessed families or locales (root %s)', (root, base) => {
  const discovery = discoverContentProject(
    ['en/guides/one.md', 'fr/guides/one.md', 'en/guides/two.md', 'fr/guides/two.md'].map((path) =>
      file(`${base}/${path}`, '# Guide'),
    ),
    { root },
  )

  expect(discovery.families).toEqual([])
  expect(discovery.locales).toEqual([])
  for (const page of discovery.pages) {
    expect(page.facts.family).toBeUndefined()
    expect(page.facts.locale).toBeUndefined()
  }
})

test('outside-root authored facts remain exact and cannot influence inside-root guesses', () => {
  const discovery = discoverContentProject(
    [
      file('/repo/shared/en/guides/one.md', '# One', { type: 'guide', locale: 'en' }),
      file('/repo/shared/fr/guides/one.md', '# Un', { type: 'guide', locale: 'fr' }),
      file('/repo/app/content/ui/one.md', '# UI'),
      file('/repo/app/content/ui/two.md', '# UI two'),
    ],
    { root: '/repo/app' },
  )
  expect(discovery.families).toEqual([
    { id: 'guide', files: 2 },
    { id: 'ui', files: 2 },
  ])
  expect(discovery.locales).toEqual([
    { id: 'en', files: 1 },
    { id: 'fr', files: 1 },
  ])
  expect(discovery.pages[0].facts.family).toEqual({
    value: 'guide',
    source: 'frontmatter',
    confidence: 'exact',
  })
  expect(discovery.pages[2].facts.locale).toBeUndefined()
})
