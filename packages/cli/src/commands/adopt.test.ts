import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
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
slug: bien-demarrer
locale: fr
title: Bien démarrer
type: guide
---

# Bien démarrer
`,
  })
  const io = fakeIo()

  expect(await withCwd(dir, () => run(['adopt', 'content/**/*.md', '--json'], io))).toBe(0)
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
  expect(report.proposals.contentbitConfig).toContain("content: 'content/**/*.md'")
  expect(report.proposals.contentbitConfig).toContain(
    "resolve: 'prefer-same-locale-key-fallback-slug'",
  )
  expect(report.proposals.seoConfig).toContain('Observed page types: guide')
})

test('adopt text output makes the no-write boundary explicit', async () => {
  const dir = await fixture({ 'content/post.md': '# Existing post\n' })
  const io = fakeIo()

  expect(await withCwd(dir, () => run(['adopt', 'content/**/*.md'], io))).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('Read-only adoption report — no files were changed.')
  expect(out).toContain('Suggested contentbit.config.ts')
})
