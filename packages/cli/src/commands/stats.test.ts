import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

const doc = [
  '---',
  'title: Post',
  '---',
  '',
  '# Hello',
  '',
  'Some prose with [a link](https://example.com/page).',
  '',
  ':::callout{type="tip"}',
  'Weigh your flour.',
  ':::',
  '',
].join('\n')

test('prints JSON stats and exits 0', async () => {
  const dir = await fixture({ 'post.md': doc })
  const file = join(dir, 'post.md')
  const io = fakeIo()
  expect(await run(['stats', file], io)).toBe(0)
  const stats = JSON.parse(io.out.join('\n'))
  expect(stats.file.path).toBe(file)
  expect(stats.frontmatter.data).toEqual({ title: 'Post' })
  expect(stats.outline).toEqual([{ level: 1, text: 'Hello', line: 5, words: 9 }])
  expect(stats.blocks.byName).toEqual({ callout: 1 })
  expect(stats.links.domains).toEqual(['example.com'])
  expect(stats.validation).toEqual({ errors: 0, warnings: 0 })
})

test('validation errors are reported but do not fail the command', async () => {
  const dir = await fixture({ 'bad.md': ':::comparison\n- only | two\n:::\n' })
  const io = fakeIo()
  expect(await run(['stats', join(dir, 'bad.md')], io)).toBe(0)
  const stats = JSON.parse(io.out.join('\n'))
  expect(stats.validation.errors).toBeGreaterThan(0)
})

test('--no-validate omits the validation field', async () => {
  const dir = await fixture({ 'post.md': doc })
  const io = fakeIo()
  expect(await run(['stats', join(dir, 'post.md'), '--no-validate'], io)).toBe(0)
  const stats = JSON.parse(io.out.join('\n'))
  expect(stats.validation).toBeUndefined()
})

test('requires at least one file', async () => {
  expect(await run(['stats'], fakeIo())).toBe(2)
})

test('multiple files produce a JSON array sorted by path', async () => {
  const dir = await fixture({ 'b.md': '# B\n', 'a.md': '# A\n' })
  const io = fakeIo()
  expect(await run(['stats', join(dir, 'b.md'), join(dir, 'a.md')], io)).toBe(0)
  const stats = JSON.parse(io.out.join('\n'))
  expect(Array.isArray(stats)).toBe(true)
  expect(stats.map((s: { file: { path: string } }) => s.file.path)).toEqual([
    join(dir, 'a.md'),
    join(dir, 'b.md'),
  ])
  expect(stats[0].validation).toEqual({ errors: 0, warnings: 0 })
})

test('a glob expands to matching files', async () => {
  const dir = await fixture({ 'a.md': '# A\n', 'b.md': '# B\n', 'c.txt': 'not markdown\n' })
  const io = fakeIo()
  expect(await run(['stats', join(dir, '*.md')], io)).toBe(0)
  const stats = JSON.parse(io.out.join('\n'))
  expect(stats).toHaveLength(2)
})

test('a glob matching a single file keeps the single-object output', async () => {
  const dir = await fixture({ 'post.md': doc })
  const io = fakeIo()
  expect(await run(['stats', join(dir, '*.md')], io)).toBe(0)
  const stats = JSON.parse(io.out.join('\n'))
  expect(Array.isArray(stats)).toBe(false)
  expect(stats.file.path).toBe(join(dir, 'post.md'))
})

test('no files matched exits 2', async () => {
  const dir = await fixture({})
  expect(await run(['stats', join(dir, '*.md')], fakeIo())).toBe(2)
})
