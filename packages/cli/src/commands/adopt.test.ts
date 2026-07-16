import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-adopt-'))
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true })
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

async function withCwd<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    return await fn()
  } finally {
    process.chdir(previous)
  }
}

test('adopt is read-only and proposes config from an existing localized library', async () => {
  const dir = await fixture({
    'content/guides/en.md': `---
key: guides/getting-started
slug: getting-started
locale: en
title: Getting started
type: guide
---

# Getting started
`,
    'content/guides/fr.md': `---
key: guides/getting-started
slug: getting-started
locale: fr
title: Bien démarrer
type: guide
---

# Bien démarrer
`,
  })
  const io = fakeIo()

  expect(
    await withCwd(dir, () => run(['adopt', 'content/**/*.md', '--dry-run', '--json'], io)),
  ).toBe(0)
  const report = JSON.parse(io.out.join('\n'))

  expect(report).toMatchObject({
    schemaVersion: 'contentbit.adoption.v1',
    dryRun: true,
    files: 2,
    inferred: {
      content: ['content/**/*.md'],
      links: { resolve: 'prefer-same-locale-key-fallback-slug' },
    },
  })
  expect(report.localeCoverage).toEqual([{ key: 'guides/getting-started', locales: ['en', 'fr'] }])
  expect(
    report.findings.some((finding: { code: string }) => finding.code === 'CB_SLUG_DUPLICATE'),
  ).toBe(false)
  expect(report.proposals.contentbitConfig).toContain("content: 'content/**/*.md'")
  expect(report.proposals.contentbitConfig).toContain(
    "resolve: 'prefer-same-locale-key-fallback-slug'",
  )
  expect(report.inferred.contracts).toEqual([
    { type: 'guide', files: 2, requiredFrontmatter: ['type'], requiredSections: [] },
  ])
  expect(report.inferred.families).toEqual([{ id: 'guide', files: 2 }])
  expect(report.inferred.locales).toEqual([
    { id: 'en', files: 1 },
    { id: 'fr', files: 1 },
  ])
  expect(report.proposals.seoConfig).toContain('"guide": { requiredFrontmatter: ["type"] }')
})

test('adopt text output makes the no-write boundary explicit', async () => {
  const dir = await fixture({ 'content/post.md': '# Existing post\n' })
  const io = fakeIo()

  expect(await withCwd(dir, () => run(['adopt', 'content/**/*.md'], io))).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('Read-only adoption report — no files were changed.')
  expect(out).toContain('Suggested contentbit.config.ts')
})

test('adopt proposes missing frontmatter without rewriting the source file', async () => {
  const source = '# Hello from an existing library\n'
  const dir = await fixture({ 'content/hello-world.md': source })
  const io = fakeIo()

  expect(await withCwd(dir, () => run(['adopt', 'content/**/*.md', '--json'], io))).toBe(0)
  const report = JSON.parse(io.out.join('\n'))

  expect(report.proposals.frontmatter).toEqual([
    {
      path: expect.stringMatching(/content\/hello-world\.md$/),
      add: { slug: 'hello-world', title: 'Hello from an existing library' },
    },
  ])
  expect(report.pages).toEqual([
    {
      path: expect.stringMatching(/content\/hello-world\.md$/),
      facts: {
        identity: {
          value: 'content/hello-world.md',
          source: 'path',
          confidence: 'exact',
        },
        slug: { value: 'hello-world', source: 'path', confidence: 'guess' },
        title: {
          value: 'Hello from an existing library',
          source: 'document',
          confidence: 'likely',
        },
      },
    },
  ])
  expect(await readFile(join(dir, 'content/hello-world.md'), 'utf8')).toBe(source)
})
