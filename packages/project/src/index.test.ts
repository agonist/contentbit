import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'

import {
  inspectContentProject,
  loadContentProject,
  ProjectLoadError,
  resolveContentFiles,
} from './index.js'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-project-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf8')
  }
  return dir
}

test('resolveContentFiles reports empty inputs as project load errors', async () => {
  await expect(resolveContentFiles([], 'doctor')).rejects.toMatchObject({
    exitCode: 2,
    message: 'doctor: provide at least one file or glob.',
  })
  await expect(resolveContentFiles([], 'doctor')).rejects.toBeInstanceOf(ProjectLoadError)
})

test('loadContentProject resolves cwd-relative globs into a content project scan', async () => {
  const dir = await fixture({
    'content/a.md': `---
slug: alpha
---

# Alpha

Useful body.
`,
  })

  const project = await loadContentProject({
    cmd: 'doctor',
    positionals: ['content/*.md'],
    cwd: dir,
    includeGenericBlocks: true,
  })

  expect(project.files).toEqual([join(dir, 'content/a.md')])
  expect(project.sources[0]?.source).toContain('# Alpha')
  expect(project.scan.files).toHaveLength(1)
  expect(project.scan.linkGraph).toMatchObject({ pages: 1, links: 0, orphans: 1 })
})

test('loadContentProject can intentionally scan an empty planned project', async () => {
  const project = await loadContentProject({
    cmd: 'brief',
    positionals: [],
    includeGenericBlocks: true,
    allowEmpty: true,
  })

  expect(project.files).toEqual([])
  expect(project.scan.files).toEqual([])
})

test('inspectContentProject returns a deterministic portable snapshot without source text', async () => {
  const dir = await fixture({
    'content/guides/alpha.md': `---
slug: alpha
title: Shared title
type: guide
linksTo:
  - beta
---

# Alpha

Private source body.
`,
    'content/guides/beta.md': `---
slug: beta
title: Shared title
type: guide
---

# Beta

Useful body.
`,
  })
  const input = {
    positionals: ['content/**/*.md'],
    cwd: dir,
    includeGenericBlocks: true,
    revision: 'abc123',
  }

  const first = await inspectContentProject(input)
  const second = await inspectContentProject(input)
  const json = JSON.stringify(first)

  expect(first).toEqual(second)
  expect(first).toMatchObject({
    schemaVersion: 'contentbit.project-snapshot.v1',
    revision: 'abc123',
    summary: { files: 2 },
    families: [{ id: 'guide', files: 2 }],
    pages: [
      {
        path: 'content/guides/alpha.md',
        contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        facts: {
          identity: { value: 'alpha', source: 'frontmatter', confidence: 'exact' },
          family: { value: 'guide', source: 'frontmatter', confidence: 'exact' },
        },
      },
      { path: 'content/guides/beta.md' },
    ],
    graph: {
      summary: { pages: 2, links: 1 },
      nodes: expect.arrayContaining([expect.objectContaining({ path: 'content/guides/alpha.md' })]),
    },
  })
  expect(JSON.parse(json)).toEqual(first)
  expect(json).not.toContain(dir)
  expect(json).not.toContain('Private source body.')
})
