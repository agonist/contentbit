import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from 'vitest'

import { doctorCommand } from './doctor'
import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-doctor-'))
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

async function waitFor(check: () => boolean, timeoutMs = 2_000): Promise<void> {
  const started = Date.now()
  while (!check()) {
    if (Date.now() - started > timeoutMs)
      throw new Error('Timed out waiting for Doctor watch output.')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

function seoConfig(): string {
  return `
export default {
  pageTypes: {
    alternative: {
      requiredFrontmatter: ["type", "intent", "keywords.primary"],
      requiredSections: [
        { id: "overview", headings: ["Overview"] },
        { id: "alternatives", headings: ["Best alternatives"] }
      ],
      minOutgoingLinks: 1
    }
  }
};
`
}

test('clean content exits 0 with a healthy text report', async () => {
  const dir = await fixture({ 'post.md': 'Plain prose with enough shape to be valid.\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('Health')
  expect(out).toMatch(/Files\s+1/)
  expect(out).toMatch(/Errors\s+0/)
  expect(out).toMatch(/Warnings\s+0/)
  expect(out).toMatch(/Suggestions\s+0/)
  expect(out).toContain('No findings')
})

test('--watch rejects JSON output because watch output is interactive', async () => {
  const io = fakeIo()
  expect(await run(['doctor', '--watch', '--json'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('doctor: --watch cannot be combined with --json.')
})

test('watch re-scans a newly added nested content file and shuts down cleanly', async () => {
  const dir = await fixture({ 'content/current.md': '# Current\n' })
  const io = fakeIo()
  const watching = doctorCommand({ globs: [join(dir, 'content/**/*.md')], watch: true }, io)

  try {
    await waitFor(() => io.out.some((line) => line.includes('Press Ctrl+C to stop.')))
    await mkdir(join(dir, 'content/new-section'), { recursive: true })
    await writeFile(join(dir, 'content/new-section/new.md'), '# New content\n', 'utf8')
    await waitFor(() => io.out.filter((line) => line.includes('contentbit doctor')).length >= 2)
  } finally {
    process.emit('SIGINT')
    await watching
  }
})

test('invalid blocks are reported as validation errors', async () => {
  const dir = await fixture({ 'bad.md': ':::comparison\n- only | two\n:::\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(1)
  const out = io.out.join('\n')
  expect(out).toContain('error validation CB_PROPS_INVALID')
  expect(out).toContain('bad.md:1:1')
})

test('dangling frontmatter links are reported as link errors', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - missing\n---\n\nProse.\n',
  })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(1)
  const out = io.out.join('\n')
  expect(out).toContain('error links CB_LINK_UNRESOLVED')
  expect(out).toContain('Link Graph')
  expect(out).toMatch(/Pages\s+1/)
  expect(out).toMatch(/Links\s+1/)
  expect(out).toMatch(/Orphans\s+1/)
})

test('thin sections are suggestions', async () => {
  const dir = await fixture({ 'thin.md': '## Deploy\nSoon.\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('info stats CB_THIN_SECTION')
})

test('blockless long documents are suggestions', async () => {
  const words = Array.from({ length: 260 }, (_, i) => `word${i}`).join(' ')
  const dir = await fixture({ 'long.md': `${words}\n` })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('info stats CB_BLOCKLESS_DOCUMENT')
})

test('missing image alt text is a suggestion', async () => {
  const dir = await fixture({ 'image.md': 'Look:\n\n![](/hero.png)\n' })
  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('info stats CB_IMAGE_ALT_MISSING')
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

test('SEO config adds SEO warnings to doctor without failing by default', async () => {
  const dir = await fixture({
    'seo.mjs': seoConfig(),
    'page.md': `---
key: ahrefs-alternatives
slug: ahrefs-alternatives
type: alternative
intent: commercial
keywords:
  primary: ahrefs alternatives
---

# Ahrefs Alternatives

## Overview

Good overview.
`,
  })
  const io = fakeIo()

  expect(await run(['doctor', join(dir, '*.md'), '--seo-config', join(dir, 'seo.mjs')], io)).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('SEO')
  expect(out).toContain('warning seo CB_SEO_SECTION_MISSING')
  expect(out).toContain('warning seo CB_SEO_OUTGOING_LINKS_MIN')
})

test('--strict-seo turns SEO warnings into failures', async () => {
  const dir = await fixture({
    'seo.mjs': seoConfig(),
    'page.md': `---
key: ahrefs-alternatives
slug: ahrefs-alternatives
type: alternative
intent: commercial
keywords:
  primary: ahrefs alternatives
---

# Ahrefs Alternatives
`,
  })

  expect(
    await run(
      ['doctor', join(dir, '*.md'), '--seo-config', join(dir, 'seo.mjs'), '--strict-seo'],
      fakeIo(),
    ),
  ).toBe(1)
})

test('--no-seo disables SEO config checks', async () => {
  const dir = await fixture({
    'seo.mjs': seoConfig(),
    'page.md': `---
key: ahrefs-alternatives
slug: ahrefs-alternatives
type: alternative
intent: commercial
keywords:
  primary: ahrefs alternatives
---

# Ahrefs Alternatives
`,
  })
  const io = fakeIo()

  expect(
    await run(['doctor', join(dir, '*.md'), '--seo-config', join(dir, 'seo.mjs'), '--no-seo'], io),
  ).toBe(0)
  expect(io.out.join('\n')).not.toContain('seo CB_SEO')
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
  expect(io.out.join('\n')).toMatch(/Errors\s+0/)
})

test('--no-generic-blocks lets doctor use a registry that owns generic block names', async () => {
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

  const io = fakeIo()
  expect(
    await run(
      [
        'doctor',
        join(dir, 'custom.md'),
        '--registry',
        join(dir, 'registry.mjs'),
        '--no-generic-blocks',
      ],
      io,
    ),
  ).toBe(0)
  const out = io.out.join('\n')
  expect(out).toMatch(/Errors\s+0/)
  expect(out).toContain('--no-generic-blocks')
})

test('next commands preserve link resolver flags', async () => {
  const dir = await fixture({
    'a.md': `---
lang: fr
pathSlug: a
canonicalKey: blog/a
linksTo:
  - blog/b
---

Prose.
`,
    'b.md': `---
lang: fr
pathSlug: b
canonicalKey: blog/b
linksTo:
  - blog/a
---

Prose.
`,
  })

  const io = fakeIo()
  const glob = join(dir, '*.md')
  expect(
    await run(
      [
        'doctor',
        glob,
        '--link-resolve',
        'same-locale-key',
        '--locale-field',
        'lang',
        '--slug-field',
        'pathSlug',
        '--key-field',
        'canonicalKey',
        '--default-locale',
        'en',
      ],
      io,
    ),
  ).toBe(0)
  const out = io.out.join('\n')
  const flags =
    '--link-resolve same-locale-key --locale-field lang --slug-field pathSlug --key-field canonicalKey --default-locale en'
  const quotedGlob = JSON.stringify(glob)
  expect(out).toContain(`contentbit validate ${quotedGlob} ${flags}`)
  expect(out).toContain(`contentbit links ${quotedGlob} ${flags}`)
  expect(out).toContain(`contentbit doctor ${quotedGlob} ${flags} --json`)
})

test('doctor reports stale installed Claude Code skills', async () => {
  const dir = await fixture({
    'package.json': '{"name":"docs"}\n',
    'post.md': 'Plain prose with enough shape to be valid.\n',
  })
  await mkdir(join(dir, '.claude/skills/contentbit-author'), { recursive: true })
  await writeFile(
    join(dir, '.claude/skills/contentbit-author/SKILL.md'),
    '---\nname: contentbit-author\nversion: 1\n---\n',
    'utf8',
  )

  const io = fakeIo()
  expect(await run(['doctor', join(dir, '*.md')], io)).toBe(0)
  const out = io.out.join('\n')
  expect(out).toContain('Warnings')
  expect(out).toContain('warning agents CB_SKILL_DRIFT')
  expect(out).toContain('contentbit-author skill is stale')
  expect(out).toContain('Re-run contentbit agents')
})

test('doctor with no globs reuses the nearest package content:doctor script', async () => {
  const dir = await fixture({
    'package.json': JSON.stringify({
      scripts: { 'content:doctor': 'contentbit doctor "content/**/*.md"' },
    }),
    'content/post.md': 'Plain prose with enough shape to be valid.\n',
  })
  const nested = join(dir, 'src')
  await mkdir(nested, { recursive: true })

  const io = fakeIo()
  await withCwd(nested, async () => {
    expect(await run(['doctor'], io)).toBe(0)
  })
  expect(io.out.join('\n')).toMatch(/Files\s+1/)
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
