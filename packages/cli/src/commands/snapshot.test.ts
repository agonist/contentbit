import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run.js'
import { fakeIo } from '../run.test.js'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-snapshot-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content, 'utf8')
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

test('snapshot prints the portable project read model as JSON', async () => {
  const dir = await fixture({
    'content/blog/hello.md': '# Hello\n\nPrivate body.\n',
    'content/blog/next.md': '# Next\n\nAnother body.\n',
  })
  const io = fakeIo()

  expect(
    await withCwd(dir, () => run(['snapshot', 'content/**/*.md', '--revision', 'abc123'], io)),
  ).toBe(0)
  const snapshot = JSON.parse(io.out.join('\n'))

  expect(snapshot).toMatchObject({
    schemaVersion: 'contentbit.project-snapshot.v1',
    revision: 'abc123',
    summary: { files: 2 },
    families: [{ id: 'blog', files: 2 }],
    pages: [
      {
        path: 'content/blog/hello.md',
        facts: {
          identity: { value: 'content/blog/hello.md', source: 'path', confidence: 'exact' },
        },
      },
      { path: 'content/blog/next.md' },
    ],
  })
  expect(JSON.stringify(snapshot)).not.toContain(dir)
  expect(JSON.stringify(snapshot)).not.toContain('Private body.')
})
