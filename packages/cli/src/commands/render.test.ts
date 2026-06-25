import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

const SRC = ':::key-metrics\n- 42% | Lift\n- 18ms | Parse\n:::\n'

async function fixtureFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-'))
  const file = join(dir, 'doc.md')
  await writeFile(file, SRC, 'utf8')
  return file
}

test('render writes markdown to stdout by default', async () => {
  const io = fakeIo()
  expect(await run(['render', await fixtureFile()], io)).toBe(0)
  expect(io.out.join('\n')).toContain('- **42%** — Lift')
})

test('render --target markdown uses the fallback renderers', async () => {
  const io = fakeIo()
  expect(await run(['render', await fixtureFile(), '--target', 'markdown'], io)).toBe(0)
  expect(io.out.join('\n')).toContain('- **42%** — Lift')
})

test('render strips frontmatter metadata before rendering', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cb-'))
  const file = join(dir, 'doc.md')
  await writeFile(file, '---\nslug: doc\nlinksTo:\n  - other\n---\n\n# Hello\n', 'utf8')
  const io = fakeIo()
  expect(await run(['render', file, '--target', 'markdown'], io)).toBe(0)
  const output = io.out.join('\n')
  expect(output).toContain('# Hello')
  expect(output).not.toContain('linksTo')
})

test('render refuses invalid content (exit 1) and prints diagnostics', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cb-'))
  const file = join(dir, 'bad.md')
  await writeFile(file, ':::steps\n1. only one\n:::\n', 'utf8')
  const io = fakeIo()
  expect(await run(['render', file], io)).toBe(1)
  expect(io.err.join('\n')).toContain('CB_ITEM_COUNT')
})

test('--out writes to a file instead of stdout', async () => {
  const writes: Array<{ path: string; content: string }> = []
  const io = {
    ...fakeIo(),
    writeFile: async (path: string, content: string) => void writes.push({ path, content }),
  }
  expect(await run(['render', await fixtureFile(), '--out', '/tmp/out.md'], io)).toBe(0)
  expect(writes[0].path).toBe('/tmp/out.md')
  expect(writes[0].content).toContain('- **42%** — Lift')
})

test('render rejects the removed html target', async () => {
  const io = fakeIo()
  expect(await run(['render', await fixtureFile(), '--target', 'html'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('--target markdown')
})
