import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const fixtures = join(root, 'fixtures/real-projects')

test('doctor passes the Cookwise-style multilingual SEO fixture', async () => {
  const dir = join(fixtures, 'cookwise-lite')
  const io = fakeIo()

  expect(
    await run(
      [
        'doctor',
        join(dir, 'content/**/*.md'),
        '--seo-config',
        join(dir, 'contentbit.seo.config.ts'),
        '--link-resolve',
        'same-locale-key',
        '--strict-seo',
        '--min-section-words',
        '0',
        '--json',
      ],
      io,
    ),
  ).toBe(0)

  const report = JSON.parse(io.out.join('\n')) as {
    seo: { pages: number; findings: unknown[] }
    findings: Array<{ source: string; code: string }>
  }
  expect(report.seo.pages).toBe(7)
  expect(report.seo.findings).toEqual([])
  expect(report.findings.filter((finding) => finding.source === 'seo')).toEqual([])
})

test('brief reads seoKeywords from existing multilingual pages', async () => {
  const dir = join(fixtures, 'cookwise-lite')
  const io = fakeIo()

  expect(
    await run(
      [
        'brief',
        'blog/cooking-oil-smoke-points',
        join(dir, 'content/**/*.md'),
        '--seo-config',
        join(dir, 'contentbit.seo.config.ts'),
        '--link-resolve',
        'same-locale-key',
        '--json',
      ],
      io,
    ),
  ).toBe(0)

  const brief = JSON.parse(io.out.join('\n')) as {
    target: { source: string; keywords?: { primary?: string } }
    acceptanceChecks: string[]
  }
  expect(brief.target.source).toBe('existing')
  expect(brief.target.keywords?.primary).toBe('cooking oil smoke points')
  expect(brief.acceptanceChecks).toContain('Document includes section: Overview.')
})

test('brief prints planned pages from the Cookwise-style SEO config', async () => {
  const dir = join(fixtures, 'cookwise-lite')
  const io = fakeIo()

  expect(
    await run(
      [
        'brief',
        'features/recipe-import-app',
        join(dir, 'content/**/*.md'),
        '--seo-config',
        join(dir, 'contentbit.seo.config.ts'),
        '--link-resolve',
        'same-locale-key',
        '--json',
      ],
      io,
    ),
  ).toBe(0)

  const brief = JSON.parse(io.out.join('\n')) as {
    target: { source: string }
    requiredLinksTo: string[]
    acceptanceChecks: string[]
  }
  expect(brief.target.source).toBe('planned')
  expect(brief.requiredLinksTo).toEqual(
    expect.arrayContaining(['features/recipe-organizer', 'glossary/recipe-import']),
  )
  expect(brief.acceptanceChecks).toContain('Create the Markdown source file for this planned page.')
})

test('doctor and brief pass the contentbit-site-shaped fixture', async () => {
  const dir = join(fixtures, 'contentbit-site-lite')
  const doctorIo = fakeIo()
  const briefIo = fakeIo()

  expect(
    await run(
      [
        'doctor',
        join(dir, 'content/**/*.{md,mdx}'),
        '--seo-config',
        join(dir, 'contentbit.seo.config.ts'),
        '--strict-seo',
        '--min-section-words',
        '0',
      ],
      doctorIo,
    ),
  ).toBe(0)

  expect(
    await run(
      [
        'brief',
        'programmatic-seo',
        join(dir, 'content/**/*.{md,mdx}'),
        '--seo-config',
        join(dir, 'contentbit.seo.config.ts'),
      ],
      briefIo,
    ),
  ).toBe(0)
  expect(briefIo.out.join('\n')).toContain('# SEO Brief: Programmatic SEO workflows')
  expect(briefIo.out.join('\n')).toContain('docs/guides/seo-briefs')
})
