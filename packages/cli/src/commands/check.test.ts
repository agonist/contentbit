import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

import { run } from '../run.js'
import { fakeIo } from '../run.test.js'

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../built-site/fixtures/${name}`, import.meta.url))

async function project(files: Record<string, string> = {}): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'cb-check-')))
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true })
    await writeFile(join(root, name), content, 'utf8')
  }
  return root
}

async function check(cwd: string, args: string[] = []) {
  const io = fakeIo()
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    const code = await run(['check', ...args], io)
    return { code, out: io.out.join('\n'), err: io.err.join('\n') }
  } finally {
    process.chdir(previous)
  }
}

const page = (canonical?: string) =>
  `<!doctype html><html><head><title>Page</title>${
    canonical ? `<link rel="canonical" href="${canonical}">` : ''
  }</head><body><h1>Page</h1></body></html>`

const unknownBlock = ':::nope\nText\n:::\n'
const unmatchedClose = 'Prose.\n\n:::\n'

test('--json prints one site check with every built page and nothing else', async () => {
  const { code, out, err } = await check(await project(), [fixture('astro-like'), '--json'])

  expect(code).toBe(0)
  expect(err).toBe('')
  const result = JSON.parse(out)
  expect(result).toMatchObject({
    schemaVersion: 'contentbit.site-check.v1',
    input: { kind: 'folder', path: fixture('astro-like') },
    origin: { url: 'https://harbor.example', source: 'canonicals' },
    summary: { pages: 3, errors: 0, warnings: 0 },
    findings: [],
  })
  expect(result.pages).toHaveLength(3)
  expect(result.content).toBeUndefined()
})

test('the report names the build, its page count and where the origin came from', async () => {
  const { code, out } = await check(await project(), [fixture('next-like')])

  expect(code).toBe(0)
  expect(out).toContain(`${fixture('next-like')}, 2 pages`)
  expect(out).toMatch(/Origin\s+https:\/\/ledger\.example \(inferred from canonicals\)/)
  expect(out).toMatch(/Errors\s+0/)
  expect(out).toMatch(/Warnings\s+0/)
  expect(out).not.toContain('Markdown')
})

test('--origin wins over site.origin, which wins over the canonicals', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { site: { build: ${JSON.stringify(
      fixture('astro-like'),
    )}, origin: 'https://Config.example/blog/' } }`,
  })

  const fromConfig = JSON.parse((await check(root, ['--json'])).out)
  expect(fromConfig.origin).toEqual({ url: 'https://config.example', source: 'config' })

  const fromFlag = JSON.parse(
    (await check(root, ['--json', '--origin', 'https://flag.example/x/'])).out,
  )
  expect(fromFlag.origin).toEqual({ url: 'https://flag.example', source: 'flag' })
})

test('the most common canonical origin is inferred, and none without an absolute canonical', async () => {
  const mixed = await project({
    'dist/index.html': page('https://www.example.com/'),
    'dist/a/index.html': page('https://staging.example.com/a/'),
    'dist/b/index.html': page('https://www.example.com/b/'),
  })
  expect(JSON.parse((await check(mixed, ['--json'])).out).origin).toEqual({
    url: 'https://www.example.com',
    source: 'canonicals',
  })

  const relative = await project({ 'dist/index.html': page('/') })
  const { code, out } = await check(relative, ['--json'])
  expect(code).toBe(0)
  expect(JSON.parse(out).origin).toBeUndefined()
  expect((await check(relative)).out).toMatch(/Origin\s+unknown/)
})

test('an --origin that is not an absolute http or https URL is an input error', async () => {
  const { code, err } = await check(await project(), [fixture('astro-like'), '--origin', 'x.com'])

  expect(code).toBe(2)
  expect(err).toContain('--origin must be an absolute http or https URL')
})

test('detection takes the first of dist/client, dist, out, build and public with an index.html', async () => {
  const folders = ['dist/client', 'dist', 'out', 'build', 'public']
  const root = await project(
    Object.fromEntries(folders.map((folder) => [`${folder}/index.html`, page()])),
  )

  for (const folder of folders) {
    const { code, out } = await check(root, ['--json'])
    expect(code).toBe(0)
    expect(JSON.parse(out).input).toEqual({ kind: 'folder', path: join(root, folder) })
    await rm(join(root, folder), { recursive: true })
  }

  await mkdir(join(root, 'public'))
  await writeFile(join(root, 'public/favicon.svg'), '<svg/>')
  const { code, err } = await check(root)
  expect(code).toBe(2)
  expect(err).toContain('check: nothing to check.')
  expect(err).toContain('No build folder in dist/client, dist, out, build or public')
})

test.each(['http://localhost:4321', 'https://example.com/'])(
  'a URL target %s is an input error: check reads build folders for now',
  async (target) => {
    const { code, err } = await check(await project(), [target])

    expect(code).toBe(2)
    expect(err).toContain('check reads a build folder for now')
    expect(err).toContain('checking a running server comes later')
  },
)

test('a target that does not exist or is not a folder is an input error naming it', async () => {
  const root = await project({ 'notes.txt': 'not a folder' })

  const missing = await check(root, ['missing-build'])
  expect(missing.code).toBe(2)
  expect(missing.err).toBe('check: build folder not found: missing-build')

  const file = await check(root, ['notes.txt'])
  expect(file.code).toBe(2)
  expect(file.err).toBe('check: notes.txt is not a folder.')
})

test('site.build resolves against the config file, not the current directory', async () => {
  const root = await project({
    'package.json': '{}',
    'contentbit.config.mjs': `export default { site: { build: 'web/out' } }`,
    'web/out/index.html': page('https://example.com/'),
  })

  const { code, out } = await check(join(root, 'web'), ['--json'])
  expect(code).toBe(0)
  expect(JSON.parse(out).input).toEqual({ kind: 'folder', path: join(root, 'web/out') })

  const missing = await project({
    'contentbit.config.mjs': `export default { site: { build: 'gone' } }`,
  })
  const { code: missingCode, err } = await check(missing)
  expect(missingCode).toBe(2)
  expect(err).toBe('check: build folder not found: gone')
})

test('without a build, the Markdown checks run alone and a notice names the build command', async () => {
  const root = await project({
    'package.json': JSON.stringify({ devDependencies: { astro: '^5.0.0' } }),
    'contentbit.config.mjs': `export default { content: 'content/*.md' }`,
    'content/bad.md': unknownBlock,
    'content/loose.md': unmatchedClose,
  })

  const { code, out, err } = await check(root)
  expect(code).toBe(1)
  expect(out).toMatch(/Build\s+not found/)
  expect(out).toMatch(/Markdown\s+2 files/)
  expect(out).toContain('Markdown findings')
  expect(out).toContain('error validation CB_UNKNOWN_BLOCK')
  expect(out).toContain('content/bad.md:1:1')
  expect(out).toMatch(/Errors\s+1/)
  expect(out).toMatch(/Warnings\s+1/)
  expect(err).toBe(
    'check: no build folder was found, so only the Markdown checks ran. Build the site first with astro build, or pass its folder: contentbit check <folder>',
  )

  const json = await check(root, ['--json'])
  const result = JSON.parse(json.out)
  expect(result).toMatchObject({
    input: {
      kind: 'none',
      searched: [
        join(root, 'dist/client'),
        join(root, 'dist'),
        join(root, 'out'),
        join(root, 'build'),
        join(root, 'public'),
      ],
    },
    summary: { pages: 0, errors: 1, warnings: 1 },
    pages: [],
    content: { files: 2 },
  })
  const doctor = fakeIo()
  const previous = process.cwd()
  process.chdir(root)
  await run(['doctor', '--json'], doctor).finally(() => process.chdir(previous))
  expect(result.content.findings).toEqual(JSON.parse(doctor.out.join('\n')).findings)
})

test.each([
  [{ dependencies: { next: '16.0.0' } }, 'next build'],
  [{ devDependencies: { '@11ty/eleventy': '3.0.0' } }, 'eleventy'],
  [{}, "your site's build command"],
])(
  'the no-build notice reads the build command from package.json %j',
  async (manifest, command) => {
    const root = await project({
      'package.json': JSON.stringify(manifest),
      'contentbit.config.mjs': `export default { content: 'content/*.md' }`,
      'content/post.md': 'Prose.\n',
    })

    const { code, err } = await check(root)
    expect(code).toBe(0)
    expect(err).toContain(`Build the site first with ${command}, or pass its folder`)
  },
)

test('warnings exit 0 unless --strict; errors exit 1', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/*.md' }`,
    'content/loose.md': unmatchedClose,
    'dist/index.html': page('https://example.com/'),
  })

  const loose = await check(root, ['--json'])
  expect(loose.code).toBe(0)
  expect(loose.err).toBe('')
  expect(JSON.parse(loose.out)).toMatchObject({
    summary: { pages: 1, errors: 0, warnings: 1 },
    content: { files: 1 },
  })
  expect((await check(root, ['--strict'])).code).toBe(1)

  await writeFile(join(root, 'content/bad.md'), unknownBlock)
  expect((await check(root)).code).toBe(1)
})

test('nothing to check is an input error', async () => {
  const { code, out, err } = await check(await project())

  expect(code).toBe(2)
  expect(out).toBe('')
  expect(err).toContain('check: nothing to check.')
})
