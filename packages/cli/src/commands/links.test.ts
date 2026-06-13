import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-links-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

test('builds an index and exits 0 for a valid graph', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n',
    'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n',
  })
  const io = fakeIo()
  expect(await run(['links', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('2 page(s)')
})

test('exits 1 and reports a dangling link', async () => {
  const dir = await fixture({ 'a.md': '---\nslug: a\nlinksTo:\n  - nope\n---\nA\n' })
  const io = fakeIo()
  expect(await run(['links', join(dir, '*.md')], io)).toBe(1)
  expect(io.err.join('\n')).toContain('CB_LINK_UNRESOLVED')
})

test('writes the index json through io.writeFile', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n',
    'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  await run(['links', join(dir, '*.md')], io)
  const path = Object.keys(writes).find((p) => p.endsWith('link-index.json'))!
  expect(path).toBeTruthy()
  const parsed = JSON.parse(writes[path])
  expect(parsed.pages.map((p: { slug: string }) => p.slug).sort()).toEqual(['a', 'b'])
})
