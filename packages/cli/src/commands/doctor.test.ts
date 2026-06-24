import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-doctor-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

test('clean content exits 0 with a healthy text report', async () => {
  const dir = await fixture({ 'post.md': 'Plain prose with enough shape to be valid.\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('1 file(s): 0 errors, 0 warnings, 0 suggestions')
  expect(io.out.join('\n')).toContain('No findings')
})

test('invalid blocks are reported as validation errors', async () => {
  const dir = await fixture({ 'bad.md': ':::comparison\n- only | two\n:::\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(1)
  const out = io.out.join('\n')
  expect(out).toContain('[error] validation CB_PROPS_INVALID')
  expect(out).toContain('bad.md:1:1')
})

test('dangling frontmatter links are reported as link errors', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - missing\n---\n\nProse.\n',
  })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(1)
  const out = io.out.join('\n')
  expect(out).toContain('[error] links CB_LINK_UNRESOLVED')
  expect(out).toContain('1 linked page(s), 1 link(s), 1 orphan(s)')
})

test('thin sections are suggestions', async () => {
  const dir = await fixture({ 'thin.md': '## Deploy\nSoon.\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('[info] stats CB_THIN_SECTION')
})

test('blockless long documents are suggestions', async () => {
  const words = Array.from({ length: 260 }, (_, i) => `word${i}`).join(' ')
  const dir = await fixture({ 'long.md': `${words}\n` })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('[info] stats CB_BLOCKLESS_DOCUMENT')
})

test('missing image alt text is a suggestion', async () => {
  const dir = await fixture({ 'image.md': 'Look:\n\n![](/hero.png)\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('[info] stats CB_IMAGE_ALT_MISSING')
})

test('--json prints the stable report shape', async () => {
  const dir = await fixture({ 'thin.md': '## Deploy\nSoon.\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md'), '--json'], io)).toBe(0)
  const report = JSON.parse(io.out.join('\n'))
  expect(report.files).toBe(1)
  expect(report.summary).toEqual({ errors: 0, warnings: 0, suggestions: 1 })
  expect(report.findings[0]).toMatchObject({
    severity: 'info',
    source: 'stats',
    code: 'CB_THIN_SECTION',
  })
})

test('--strict-warnings turns warnings into failures', async () => {
  const dir = await fixture({ 'orphan.md': '---\nslug: orphan\n---\n\nProse.\n' })
  expect(await run(['doctor', join(dir, '*.md')], fakeIo())).toBe(0)
  expect(await run(['doctor', join(dir, '*.md'), '--strict-warnings'], fakeIo())).toBe(1)
})

test('a custom --registry module adds blocks', async () => {
  const coreUrl = pathToFileURL(
    join(new URL('../../..', import.meta.url).pathname, 'core/dist/index.js'),
  ).href
  const dir = await fixture({
    'custom.md': ':::shout\nHEY\n:::\n',
    'registry.mjs': `
import { defineBlock, markdownBody } from "${coreUrl}";
export default [
  defineBlock({
    name: "shout",
    description: "Shouts.",
    content: markdownBody(),
    authoring: { useWhen: [], avoidWhen: [], example: "" },
  }),
];
`,
  })
  const io = fakeIo()
  expect(
    await run(['doctor', join(dir, 'custom.md'), '--registry', join(dir, 'registry.mjs')], io),
  ).toBe(0)
  expect(io.out.join('\n')).toContain('0 errors')
})

test('requires at least one file', async () => {
  expect(await run(['doctor'], fakeIo())).toBe(2)
})

test('no files matched exits 2', async () => {
  const dir = await fixture({})
  expect(await run(['doctor', join(dir, '*.md')], fakeIo())).toBe(2)
})

test('doctor does not write files or the link index', async () => {
  const dir = await fixture({ 'orphan.md': '---\nslug: orphan\n---\n\nProse.\n' })
  const writes: string[] = []
  const io = { ...fakeIo(), writeFile: async (p: string) => void writes.push(p) }
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(writes).toEqual([])
})
