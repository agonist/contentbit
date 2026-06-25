import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
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

test('valid files exit 0 with a summary', async () => {
  const dir = await fixture({ 'good.md': ':::callout{type="tip"}\nWeigh your flour.\n:::\n' })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('Validation')
  expect(io.out.join('\n')).toContain('Files     1')
  expect(io.out.join('\n')).toContain('Errors    0')
})

test('invalid files exit 1 and print formatted line-level diagnostics', async () => {
  const dir = await fixture({ 'bad.md': ':::comparison\n- only | two\n:::\n' })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(1)
  const all = io.err.join('\n')
  expect(all).toContain('bad.md:1:1 error CB_PROPS_INVALID')
})

test('block syntax inside YAML frontmatter is not validated as content', async () => {
  const dir = await fixture({
    'fm.md': '---\ntitle: x\nsnippet: |\n  :::note\n---\n\nProse only.\n',
  })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('Errors    0')
})

test('--strict-warnings turns warnings into failures', async () => {
  const dir = await fixture({ 'warn.md': 'hello\n:::\nworld\n' }) // stray close => warning
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(0)
  expect(await run(['validate', join(dir, '*.md'), '--strict-warnings'], fakeIo())).toBe(1)
})

test('a custom --registry module adds blocks', async () => {
  // Bare specifier "@contentbit/core" can't resolve from /tmp; use a file URL
  // of the built core package dist instead (requires `pnpm --filter @contentbit/core build`).
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
    await run(['validate', join(dir, 'custom.md'), '--registry', join(dir, 'registry.mjs')], io),
  ).toBe(0)
})

test('--no-generic-blocks lets a registry own generic block names', async () => {
  const coreUrl = pathToFileURL(
    join(new URL('../../..', import.meta.url).pathname, 'core/dist/index.js'),
  ).href
  const dir = await fixture({
    'custom.md': ':::quick-ref\nProject-owned quick reference content.\n:::\n',
    'registry.mjs': `
import { defineBlock, markdownBody } from "${coreUrl}";
export default [
  defineBlock({
    name: "quick-ref",
    description: "Project quick reference.",
    content: markdownBody(),
    authoring: { useWhen: [], avoidWhen: [], example: "" },
  }),
];
`,
  })

  const duplicate = fakeIo()
  expect(
    await run(
      ['validate', join(dir, 'custom.md'), '--registry', join(dir, 'registry.mjs')],
      duplicate,
    ),
  ).toBe(1)
  expect(duplicate.err.join('\n')).toContain('Duplicate block "quick-ref"')

  const owned = fakeIo()
  expect(
    await run(
      [
        'validate',
        join(dir, 'custom.md'),
        '--registry',
        join(dir, 'registry.mjs'),
        '--no-generic-blocks',
      ],
      owned,
    ),
  ).toBe(0)
  expect(owned.out.join('\n')).toContain('Errors    0')
})

test('no matching files exits 2', async () => {
  const dir = await fixture({})
  expect(await run(['validate', join(dir, '*.md')], fakeIo())).toBe(2)
})

test('validate fails on a dangling internal link', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - missing\n---\n\nProse.\n',
  })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(1)
  expect(io.err.join('\n')).toContain('CB_LINK_UNRESOLVED')
})

test('validate ignores link checks when no file declares a slug', async () => {
  const dir = await fixture({ 'a.md': '---\ntitle: just prose\n---\n\nProse.\n' })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(0)
  expect(io.err.join('\n')).not.toContain('CB_LINK')
})
