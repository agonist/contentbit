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

const page = (canonical?: string, body = '<h1>Page</h1>') =>
  `<!doctype html><html><head><title>Page</title><meta name="description" content="A page.">${
    canonical ? `<link rel="canonical" href="${canonical}">` : ''
  }</head><body>${body}</body></html>`

const unknownBlock = ':::nope\nText\n:::\n'
const unmatchedClose = 'Prose.\n\n:::\n'

test('--json prints one site check with every built page and its findings, and nothing else', async () => {
  const { code, out, err } = await check(await project(), [fixture('astro-like'), '--json'])

  expect(code).toBe(1)
  expect(err).toBe('')
  const result = JSON.parse(out)
  expect(result).toMatchObject({
    schemaVersion: 'contentbit.site-check.v1',
    input: { kind: 'folder', path: fixture('astro-like') },
    origin: { url: 'https://harbor.example', source: 'canonicals' },
    summary: { pages: 3, errors: 2, warnings: 1 },
  })
  expect(result.findings).toEqual([
    {
      code: 'CB_LINK_ANCHOR_MISSING',
      severity: 'error',
      message: 'The link #what-doesnt-work points to an id that this page does not have.',
      hint: expect.any(String),
      target: '#what-doesnt-work',
      element: 'nav a.toc-link',
      origin: { kind: 'page', page: '/blog/first-post/' },
    },
    {
      code: 'CB_PAGE_IMAGE_ALT_MISSING',
      severity: 'warning',
      message: 'The image /_astro/build-times.B7cq2Lp1.webp has no alt attribute.',
      hint: expect.any(String),
      target: '/_astro/build-times.B7cq2Lp1.webp',
      element: 'main img.figure-image',
      origin: { kind: 'page', page: '/blog/first-post/' },
    },
    {
      code: 'CB_LINK_PAGE_MISSING',
      severity: 'error',
      message: 'The link /fr/ points to no built page, redirect or host route.',
      hint: expect.any(String),
      target: '/fr/',
      element: 'nav a.brand',
      origin: { kind: 'page', page: '/fr/blog/first-post/' },
    },
  ])
  expect(result.pages).toHaveLength(3)
  expect(result.content).toBeUndefined()
})

test('the report names the build, its page count and where the origin came from', async () => {
  const { code, out } = await check(await project(), [fixture('next-like')])

  expect(code).toBe(1)
  expect(out).toContain(`${fixture('next-like')}, 2 pages`)
  expect(out).toMatch(/Origin\s+https:\/\/ledger\.example \(inferred from canonicals\)/)
  expect(out).toMatch(/Errors\s+2/)
  expect(out).toMatch(/Warnings\s+1/)
  expect(out).not.toContain('Markdown')
})

test('the report groups built-page findings by code, errors first, with five examples each', async () => {
  const links = Array.from({ length: 7 }, (_, n) => `<a href="/gone-${n}/">Gone</a>`).join('')
  const root = await project({
    'dist/index.html': `<title>Home</title><meta name="description" content="Home."><link rel="canonical" href="https://example.com/"><h1>Home</h1>${links}`,
    'dist/a/index.html': `<title>A</title><meta name="description" content="A."><h1>A</h1><a href="/gone-0/">Gone</a>`,
  })

  const { code, out } = await check(root)
  expect(code).toBe(1)
  const report = out.slice(out.indexOf('Built-page findings'), out.indexOf('  Errors'))
  expect(report).toBe(
    [
      'Built-page findings',
      '  error CB_LINK_PAGE_MISSING  8 findings on 2 pages',
      '     hint Fix the link or add a redirect. If the host app serves the path, add it to links.hostRoutes.',
      '     /  The link /gone-0/ points to no built page, redirect or host route.',
      '     /  The link /gone-1/ points to no built page, redirect or host route.',
      '     /  The link /gone-2/ points to no built page, redirect or host route.',
      '     /  The link /gone-3/ points to no built page, redirect or host route.',
      '     /  The link /gone-4/ points to no built page, redirect or host route.',
      '     and 3 more, listed by contentbit check --json',
      '  warning CB_PAGE_CANONICAL_MISSING  1 finding on 1 page',
      '     hint Add a <link rel="canonical"> with the URL of the page itself.',
      '     /a/  The page has no canonical URL.',
      '',
      '',
    ].join('\n'),
  )
  expect(out).toMatch(/Errors\s+8/)
  expect(out).toMatch(/Warnings\s+1/)
})

test('a site without built-page findings prints no built-page section', async () => {
  const root = await project({ 'dist/index.html': page('https://example.com/') })

  const { code, out } = await check(root)
  expect(code).toBe(0)
  expect(out).not.toContain('Built-page findings')
})

test('the checks use the resolved origin and the links.hostRoutes of the config', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { links: { hostRoutes: ['/api/status'] } }`,
    'dist/index.html': page(
      'https://www.example.com/',
      '<h1>Home</h1><a href="/api/status">Status</a><a href="https://example.com/gone/">Gone</a>',
    ),
  })

  const withOrigin = JSON.parse(
    (await check(root, ['--json', '--origin', 'https://example.com'])).out,
  )
  expect(withOrigin.findings.map(({ code }: { code: string }) => code)).toEqual([
    'CB_LINK_PAGE_MISSING',
    'CB_PAGE_CANONICAL_ORIGIN',
  ])

  const inferred = JSON.parse((await check(root, ['--json'])).out)
  expect(inferred.origin).toEqual({ url: 'https://www.example.com', source: 'canonicals' })
  expect(inferred.findings).toEqual([])
})

test('with a build, the Markdown checks that guessed at the rendered page are dropped; without one they stay', async () => {
  const guessed = ['CB_H1_MISSING', 'CB_INTERNAL_URL_UNRESOLVED', 'CB_MARKDOWN_ANCHOR_UNRESOLVED']
  const markdown = {
    'contentbit.config.mjs': `export default { content: 'content/*.md' }`,
    'content/post.md':
      '---\nslug: post\n---\n\nSee [a page](/nowhere), [a section](#nope) and [a file](./gone.md).\n',
  }
  const codes = (result: { content: { findings: Array<{ code: string }> } }) =>
    result.content.findings.map(({ code }) => code)

  const markdownOnly = JSON.parse((await check(await project(markdown), ['--json'])).out)
  expect(codes(markdownOnly)).toEqual(
    expect.arrayContaining([...guessed, 'CB_MARKDOWN_LINK_UNRESOLVED']),
  )

  const built = await project({ ...markdown, 'dist/index.html': page('https://example.com/') })
  const withBuild = JSON.parse((await check(built, ['--json'])).out)
  expect(withBuild.findings).toEqual([])
  expect(withBuild.content.files).toBe(1)
  expect(codes(withBuild)).toEqual(codes(markdownOnly).filter((code) => !guessed.includes(code)))
  expect(withBuild.summary.warnings).toBe(markdownOnly.summary.warnings - guessed.length)
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
