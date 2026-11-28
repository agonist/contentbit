import type { ContentProjectFinding } from '@contentbit/core'
import { expect, test } from 'vitest'

import {
  createSiteCheck,
  pagePath,
  siteSources,
  type BuiltSite,
  type RenderedPageFacts,
  type SiteFinding,
} from './index.js'

const facts = (title: string): RenderedPageFacts => ({
  title,
  robots: { noindex: false, nofollow: false },
  alternates: [],
  structuredData: [],
  headings: [],
  ids: [],
  links: [],
  images: [],
  textLength: 0,
})

const site: BuiltSite = {
  root: '/site/dist',
  pages: [
    { path: pagePath('/'), file: 'index.html', facts: facts('Home') },
    { path: pagePath('/about/'), file: 'about/index.html', facts: facts('About') },
  ],
  files: ['index.html', 'about/index.html'],
  redirects: [],
}

const siteFinding = (severity: SiteFinding['severity']): SiteFinding => ({
  code: severity === 'error' ? 'CB_PAGE_TITLE_MISSING' : 'CB_PAGE_H1_MISSING',
  severity,
  message: 'A finding.',
  origin: { kind: 'page', page: pagePath('/') },
})

const contentFinding = (severity: ContentProjectFinding['severity']): ContentProjectFinding => ({
  severity,
  source: 'validation',
  code: 'CB_EXAMPLE',
  file: '/site/content/post.md',
  line: 1,
  column: 1,
  message: 'A finding.',
})

test('a site check lists the built pages and counts errors and warnings from both parts', () => {
  const content = {
    files: 1,
    findings: [contentFinding('error'), contentFinding('warning'), contentFinding('info')],
  }
  const check = createSiteCheck({
    input: { kind: 'folder', path: '/site/dist' },
    site,
    origin: { url: 'https://example.com', source: 'canonicals' },
    findings: [siteFinding('error'), siteFinding('warning'), siteFinding('warning')],
    content,
  })

  expect(check).toEqual({
    schemaVersion: 'contentbit.site-check.v1',
    input: { kind: 'folder', path: '/site/dist' },
    origin: { url: 'https://example.com', source: 'canonicals' },
    summary: { pages: 2, errors: 2, warnings: 3 },
    pages: site.pages,
    findings: [siteFinding('error'), siteFinding('warning'), siteFinding('warning')],
    content,
  })
})

test('a site check without a build has no pages and says where it looked', () => {
  const check = createSiteCheck({
    input: { kind: 'none', searched: ['/site/dist', '/site/out'] },
    findings: [],
    content: { files: 2, findings: [contentFinding('warning')] },
  })

  expect(check.pages).toEqual([])
  expect(check.summary).toEqual({ pages: 0, errors: 0, warnings: 1 })
  expect(JSON.parse(JSON.stringify(check))).toEqual({
    schemaVersion: 'contentbit.site-check.v1',
    input: { kind: 'none', searched: ['/site/dist', '/site/out'] },
    summary: { pages: 0, errors: 0, warnings: 1 },
    pages: [],
    findings: [],
    content: { files: 2, findings: [contentFinding('warning')] },
  })
})

test('a built page with a source document names its file', () => {
  const check = createSiteCheck({
    input: { kind: 'folder', path: '/site/dist' },
    site,
    findings: [],
    sources: siteSources(
      site,
      [
        {
          file: '/site/content/about.md',
          text: '# About\n',
          route: '/about',
          facts: { frontmatter: {} },
        },
        { file: '/site/content/notes.md', text: '# Notes\n', facts: { frontmatter: {} } },
      ],
      { now: new Date() },
    ),
  })

  expect(check.pages.map(({ path, source }) => [path, source])).toEqual([
    ['/', undefined],
    ['/about/', '/site/content/about.md'],
  ])
})
