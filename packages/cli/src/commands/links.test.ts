import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
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
  expect(io.out.join('\n')).toContain('Link Index')
  expect(io.out.join('\n')).toMatch(/Pages\s+2/)
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

test('creates a missing parent directory for the index file (real fs write)', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n',
    'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n',
  })
  // The default output dir .contentbit/ does not exist yet; use the real
  // fs-backed writeFile (not the captured mock) to exercise directory creation.
  const out = join(dir, '.contentbit', 'link-index.json')
  const io = { ...fakeIo(), writeFile: (p: string, c: string) => writeFile(p, c, 'utf8') }
  expect(await run(['links', join(dir, '*.md'), '--out', out], io)).toBe(0)
  const parsed = JSON.parse(await readFile(out, 'utf8'))
  expect(parsed.pages.map((p: { slug: string }) => p.slug).sort()).toEqual(['a', 'b'])
})

test('--fix rewrites alias references to the current slug in source', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - old-b\n---\nA\n',
    'b.md': '---\nslug: b\naliases:\n  - old-b\nlinksTo:\n  - a\n---\nB\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  expect(await run(['links', join(dir, '*.md'), '--fix'], io)).toBe(0)
  const aWrite = Object.entries(writes).find(([p]) => p.endsWith('a.md'))
  expect(aWrite).toBeTruthy()
  expect(aWrite![1]).toContain('- b')
  expect(aWrite![1]).not.toContain('old-b')
  // The page that DECLARES the alias must keep it intact — rewriting it would
  // erase the rename record and break future references to the old slug.
  const bWrite = Object.entries(writes).find(([p]) => p.endsWith('b.md'))
  if (bWrite) expect(bWrite[1]).toContain('old-b')
})

test('--fix leaves files without alias references untouched (no write)', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n',
    'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  await run(['links', join(dir, '*.md'), '--fix'], io)
  expect(Object.keys(writes).some((p) => p.endsWith('a.md') || p.endsWith('b.md'))).toBe(false)
})

test('--fix skips rewrites when the link graph has errors', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - old-target\n---\nA\n',
    'b.md': '---\nslug: b\naliases:\n  - old-target\n---\nB\n',
    'c.md': '---\nslug: c\naliases:\n  - old-target\n---\nC\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  expect(await run(['links', join(dir, '*.md'), '--fix'], io)).toBe(1)
  expect(io.err.join('\n')).toContain('CB_ALIAS_CONFLICT')
  expect(io.err.join('\n')).toContain('--fix skipped')
  expect(Object.keys(writes).some((p) => p.endsWith('.md'))).toBe(false)
})

test('supports same-locale slug resolution from the CLI', async () => {
  const dir = await fixture({
    'en-a.md': '---\nlocale: en\nslug: pizza\nlinksTo:\n  - cold\n---\nA\n',
    'en-b.md': '---\nlocale: en\nslug: cold\nlinksTo:\n  - pizza\n---\nB\n',
    'fr-a.md': '---\nlocale: fr\nslug: pizza\nlinksTo:\n  - froid\n---\nA\n',
    'fr-b.md': '---\nlocale: fr\nslug: froid\nlinksTo:\n  - pizza\n---\nB\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  expect(await run(['links', join(dir, '*.md'), '--link-resolve', 'same-locale-slug'], io)).toBe(0)
  const parsed = JSON.parse(Object.values(writes).find((value) => value.includes('"pages"'))!)
  const fr = parsed.pages.find(
    (p: { locale?: string; slug: string }) => p.locale === 'fr' && p.slug === 'pizza',
  )
  expect(fr.linksTo).toEqual([{ target: 'froid', locale: 'fr', slug: 'froid' }])
})

test('--fix rewrites only same-locale aliases in same-locale slug mode', async () => {
  const dir = await fixture({
    'fr-a.md': '---\nlocale: fr\nslug: a\nlinksTo:\n  - old-b\n---\nA\n',
    'fr-b.md': '---\nlocale: fr\nslug: b\naliases:\n  - old-b\nlinksTo:\n  - a\n---\nB\n',
    'en-b.md': '---\nlocale: en\nslug: b-en\naliases:\n  - old-b\n---\nB\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  expect(
    await run(['links', join(dir, '*.md'), '--fix', '--link-resolve', 'same-locale-slug'], io),
  ).toBe(0)
  const aWrite = Object.entries(writes).find(([p]) => p.endsWith('fr-a.md'))
  expect(aWrite?.[1]).toContain('- b')
  expect(aWrite?.[1]).not.toContain('b-en')
})
