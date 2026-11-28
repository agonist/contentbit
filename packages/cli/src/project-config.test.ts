import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from './run.js'
import { fakeIo } from './run.test.js'

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-project-config-'))
  for (const [name, source] of Object.entries(files)) {
    const path = join(root, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, source)
  }
  return root
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

const siteOnlyConfig = `export default { site: { build: 'dist', origin: 'https://example.com' } }`

test.each(['validate', 'links', 'stats', 'studio'])(
  '%s still asks for files when the config has no content and no globs are passed',
  async (command) => {
    const root = await project({ 'contentbit.config.mjs': siteOnlyConfig })
    const io = fakeIo()

    expect(await withCwd(root, () => run([command], io))).toBe(2)
    expect(io.err.join('\n')).toBe(`${command}: provide at least one file or glob.`)
  },
)

test('a config without content still serves commands given explicit globs', async () => {
  const root = await project({
    'contentbit.config.mjs': siteOnlyConfig,
    'content/post.md': 'Plain prose.\n',
  })
  const io = fakeIo()

  expect(await withCwd(root, () => run(['validate', 'content/*.md'], io))).toBe(0)
})

test.each([
  ['site: "dist"', 'Contentbit config "site" must be an object'],
  ['site: { build: "" }', 'Contentbit config "site.build" must be a non-empty string'],
  ['site: { draftField: "" }', 'Contentbit config "site.draftField" must be a non-empty string'],
  ['site: { dateField: 1 }', 'Contentbit config "site.dateField" must be a non-empty string'],
  [
    'site: { origin: "example.com" }',
    'Contentbit config "site.origin" must be an absolute http or https URL, not "example.com"',
  ],
  [
    'site: { origin: "ftp://example.com" }',
    'Contentbit config "site.origin" must be an absolute http or https URL',
  ],
])('an invalid %s is an input error with exit 2', async (site, message) => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/*.md', ${site} }`,
    'content/post.md': 'Plain prose.\n',
  })
  const io = fakeIo()

  expect(await withCwd(root, () => run(['validate'], io))).toBe(2)
  expect(io.err.join('\n')).toContain(message)
  expect(io.err.join('\n')).toContain(join(root, 'contentbit.config.mjs'))
})
