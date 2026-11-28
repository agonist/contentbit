import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const fixtures = join(root, 'fixtures/real-projects')

/** Run `contentbit check` from a fixture, which reads the fixture's contentbit config. */
async function checkFixture(name: string, args: string[]) {
  const io = fakeIo()
  const previous = process.cwd()
  process.chdir(join(fixtures, name))
  try {
    return { code: await run(['check', ...args], io), out: io.out.join('\n') }
  } finally {
    process.chdir(previous)
  }
}

test('check passes the Cookwise-style multilingual SEO fixture', async () => {
  const { code, out } = await checkFixture('cookwise-lite', [
    '--strict-seo',
    '--min-section-words',
    '0',
    '--json',
  ])
  expect(code).toBe(0)

  const report = JSON.parse(out) as {
    content: { files: number; findings: Array<{ source: string; code: string }> }
  }
  expect(report.content.files).toBe(6)
  expect(report.content.findings.filter((finding) => finding.source === 'seo')).toEqual([])
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

test('check and brief pass the contentbit-site-shaped fixture', async () => {
  const dir = join(fixtures, 'contentbit-site-lite')
  const briefIo = fakeIo()

  const { code } = await checkFixture('contentbit-site-lite', [
    '--strict-seo',
    '--min-section-words',
    '0',
  ])
  expect(code).toBe(0)

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
