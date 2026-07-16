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
