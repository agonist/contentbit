import { mkdir, mkdtemp, realpath, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
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

const coreUrl = pathToFileURL(
  fileURLToPath(new URL('../../../core/dist/index.js', import.meta.url)),
).href

async function waitFor(condition: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for a check rerun.')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

async function watchUntil(
  cwd: string,
  change: () => Promise<void>,
  rerun: (report: string) => boolean,
): Promise<{ code: number; reports: string[] }> {
  const io = fakeIo()
  const reports = () => io.out.filter((line) => line.startsWith('contentbit check'))
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    const watching = run(['check', '--watch'], io)
    try {
      await waitFor(() => io.out.some((line) => line.includes('Press Ctrl+C to stop.')))
      await change()
      await waitFor(() => reports().slice(1).some(rerun))
    } finally {
      process.emit('SIGINT')
    }
    return { code: await watching, reports: reports() }
  } finally {
    process.chdir(previous)
  }
}

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
    'dist/index.html': `<title>Home</title><meta name="description" content="Home."><link rel="canonical" href="https://example.com/"><h1>Home</h1><main>${links}</main>`,
    'dist/a/index.html': `<title>A</title><meta name="description" content="A."><h1>A</h1><footer><a href="/gone-0/">Gone</a></footer>`,
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

test('a template finding prints on one line: its element, page count and three example pages', async () => {
  const toc = (n: number) =>
    `<nav><a class="toc-link level-2 active" href="#gone-${n}">Gone</a></nav>`
  const pages = ['', 'a/', 'b/', 'c/', 'd/']
  const root = await project(
    Object.fromEntries(
      pages.map((path, n) => [
        `dist/${path}index.html`,
        `<title>Page ${n}</title><meta name="description" content="Page ${n}."><h1>Page</h1>${toc(n)}`,
      ]),
    ),
  )

  const { code, out } = await check(root)
  expect(code).toBe(1)
  const report = out.slice(out.indexOf('Built-page findings'), out.indexOf('  Errors'))
  expect(report).toBe(
    [
      'Built-page findings',
      '  error CB_LINK_ANCHOR_MISSING  nav a.toc-link.level-2… on 5 pages: / (#gone-0), /a/ (#gone-1), /b/ (#gone-2) and 2 more',
      '  warning CB_PAGE_CANONICAL_MISSING  link[rel=canonical] on 5 pages: /, /a/, /b/ and 2 more',
      '',
      '',
    ].join('\n'),
  )
  expect(out).toMatch(/Errors\s+1/)
  expect(out).toMatch(/Warnings\s+1/)

  const { findings } = JSON.parse((await check(root, ['--json'])).out)
  expect(findings[0]).toMatchObject({
    code: 'CB_LINK_ANCHOR_MISSING',
    element: 'nav a.toc-link.level-2.active',
    origin: { kind: 'template', pages: ['/', '/a/', '/b/', '/c/', '/d/'] },
  })
  expect(findings[0].occurrences).toHaveLength(5)
})

test('with links.routes, a finding that a Markdown source writes points at its file and line', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/**/*.md', links: { routes: { 'content/blog': '/blog/{slug}' } } }`,
    'content/blog/post.md': '---\nslug: post\ntitle: Post\n---\n\nRead [the guide](/guide/).\n',
    'dist/index.html':
      '<title>Home</title><meta name="description" content="Home."><link rel="canonical" href="https://example.com/"><h1>Home</h1>',
    'dist/blog/post/index.html':
      '<title>Post</title><meta name="description" content="A post."><link rel="canonical" href="https://example.com/blog/post/"><h1>Post</h1><main><a href="/guide/">the guide</a></main>',
  })
  const file = join(root, 'content/blog/post.md')

  const result = JSON.parse((await check(root, ['--json'])).out)
  expect(
    result.pages.map(({ path, source }: { path: string; source?: string }) => [path, source]),
  ).toEqual([
    ['/', undefined],
    ['/blog/post/', file],
  ])
  expect(result.findings).toEqual([
    {
      code: 'CB_LINK_PAGE_MISSING',
      severity: 'error',
      message: 'The link /guide/ points to no built page, redirect or host route.',
      hint: expect.any(String),
      target: '/guide/',
      element: 'main a',
      origin: { kind: 'source', file, line: 6, column: 18, page: '/blog/post/' },
    },
  ])

  const { out } = await check(root)
  expect(out).toContain(
    '     content/blog/post.md:6:18  The link /guide/ points to no built page, redirect or host route.',
  )
})

const routedBlog = {
  'contentbit.config.mjs': `export default { content: 'content/**/*.md', links: { routes: { 'content/blog': '/blog/{slug}/' } }, site: { dateField: 'publishedOn' } }`,
  'content/blog/post.md': '---\nslug: post\ntitle: How to proof dough\n---\n\nText.\n',
  'content/blog/new.md': '---\nslug: new\ntitle: A new post\n---\n\nText.\n',
  'content/blog/draft.md': '---\nslug: draft\ntitle: A draft\ndraft: true\n---\n\nText.\n',
  'content/blog/later.md':
    '---\nslug: later\ntitle: Later\npublishedOn: 2999-01-01\n---\n\nText.\n',
  'dist/index.html':
    '<title>Home</title><meta name="description" content="Home."><link rel="canonical" href="https://example.com/"><h1>Home</h1>',
  'dist/blog/post/index.html':
    '<title>Bread basics | Example</title><meta name="description" content="A post."><link rel="canonical" href="https://example.com/blog/post/"><h1>Bread basics</h1>',
}

test('with links.routes, check compares each source document with its built page and reports a published one never built', async () => {
  const root = await project(routedBlog)

  const { code, out } = await check(root, ['--json'])
  expect(code).toBe(1)
  expect(JSON.parse(out).findings).toEqual([
    {
      code: 'CB_SITE_SOURCE_NOT_BUILT',
      severity: 'error',
      message:
        'links.routes gives this document the route /blog/new/, which has no built page, redirect or host route.',
      hint: expect.any(String),
      target: '/blog/new/',
      origin: {
        kind: 'source',
        file: join(root, 'content/blog/new.md'),
        line: 1,
        page: '/blog/new/',
      },
    },
    {
      code: 'CB_PAGE_TITLE_MISMATCH',
      severity: 'warning',
      message:
        'The page\'s title "Bread basics | Example" does not contain the title "How to proof dough" from its source document.',
      hint: expect.any(String),
      target: 'How to proof dough',
      element: 'title',
      origin: {
        kind: 'source',
        file: join(root, 'content/blog/post.md'),
        line: 3,
        column: 8,
        page: '/blog/post/',
      },
    },
  ])

  const report = (await check(root)).out
  expect(report).toContain('error CB_SITE_SOURCE_NOT_BUILT  1 finding on 1 page')
  expect(report).toContain('     content/blog/new.md:1  links.routes gives this document')
  expect(report).toContain('warning CB_PAGE_TITLE_MISMATCH  1 finding on 1 page')
  expect(report).toContain('     content/blog/post.md:3:8  The page\'s title "Bread basics')
})

test('a Markdown file newer than the build gives a notice, and its source findings become warnings', async () => {
  const root = await project(routedBlog)
  const age = (seconds: number, ...files: string[]) =>
    Promise.all(files.map((file) => utimes(join(root, file), seconds, seconds)))
  await age(1_000, 'dist/index.html', 'dist/blog/post/index.html')
  await age(500, 'content/blog/post.md', 'content/blog/draft.md', 'content/blog/later.md')
  await age(2_000, 'content/blog/new.md')

  const { code, out, err } = await check(root, ['--json'])
  expect(code).toBe(0)
  expect(err).toBe(
    "check: 1 Markdown file changed after the build in dist, so its pages may not show them yet. Rebuild the site with your site's build command and check again.",
  )
  const result = JSON.parse(out)
  expect(result.staleSources).toEqual([join(root, 'content/blog/new.md')])
  expect(result.summary.errors).toBe(0)
  expect(result.findings[0]).toMatchObject({
    code: 'CB_SITE_SOURCE_NOT_BUILT',
    severity: 'warning',
    message: expect.stringContaining('The document changed after the build'),
  })

  const report = await check(root)
  expect(report.out).toContain('warning CB_SITE_SOURCE_NOT_BUILT  1 finding on 1 page')
  expect(report.out).not.toContain('error CB_SITE_SOURCE_NOT_BUILT')
  expect(report.err).toBe(err)
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

test('the Markdown checks leave the h1, internal URLs and anchors to the built pages, with or without a build', async () => {
  const markdown = {
    'contentbit.config.mjs': `export default { content: 'content/*.md' }`,
    'content/post.md':
      '---\nslug: post\n---\n\nSee [a page](/nowhere), [a section](#nope) and [a file](./gone.md).\n',
  }
  type Result = { content: { findings: Array<{ source: string; code: string }> } }
  const codes = (result: Result, source?: string) =>
    result.content.findings
      .filter((finding) => source === undefined || finding.source === source)
      .map(({ code }) => code)

  const markdownOnly = JSON.parse((await check(await project(markdown), ['--json'])).out)
  expect(codes(markdownOnly, 'integrity')).toEqual(['CB_MARKDOWN_LINK_UNRESOLVED'])

  const built = await project({ ...markdown, 'dist/index.html': page('https://example.com/') })
  const withBuild = JSON.parse((await check(built, ['--json'])).out)
  expect(withBuild.findings).toEqual([])
  expect(codes(withBuild)).toEqual(codes(markdownOnly))
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

test('--strict-seo fails on SEO warnings, which exit 0 without it, and --no-seo turns them off', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/*.md', seo: './seo.mjs' }`,
    'seo.mjs': `export default {
      pageTypes: {
        alternative: { requiredSections: [{ id: 'alternatives', headings: ['Best alternatives'] }] },
      },
    }`,
    'content/page.md': '---\nslug: page\ntype: alternative\n---\n\n# Ahrefs alternatives\n',
  })
  const seo = (out: string) =>
    JSON.parse(out).content.findings.filter(({ source }: { source: string }) => source === 'seo')

  const loose = await check(root, ['--json'])
  expect(loose.code).toBe(0)
  expect(seo(loose.out)).toMatchObject([{ severity: 'warning', code: 'CB_SEO_SECTION_MISSING' }])
  expect((await check(root, ['--strict-seo'])).code).toBe(1)

  const off = await check(root, ['--json', '--strict-seo', '--no-seo'])
  expect(off.code).toBe(0)
  expect(seo(off.out)).toEqual([])
})

test('--min-section-words sets the thin-section threshold and must be a whole number', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/*.md' }`,
    'content/post.md': '## Deploy\n\nShip it on Fridays only.\n',
  })
  const thin = async (args: string[]) =>
    JSON.parse((await check(root, ['--json', ...args])).out).content.findings.filter(
      ({ code }: { code: string }) => code === 'CB_THIN_SECTION',
    )

  expect(await thin([])).toMatchObject([{ severity: 'info', line: 1 }])
  expect(await thin(['--min-section-words', '3'])).toEqual([])

  const invalid = await check(root, ['--min-section-words', 'many'])
  expect(invalid.code).toBe(2)
  expect(invalid.err).toBe('check: --min-section-words must be a non-negative integer.')
})

test('a Claude Code skill older than the one the CLI ships is a warning', async () => {
  const root = await project({
    'package.json': '{"name":"docs"}\n',
    'contentbit.config.mjs': `export default { content: '*.md' }`,
    'post.md': 'Plain prose with enough shape to be valid.\n',
    '.claude/skills/contentbit-author/SKILL.md': '---\nname: contentbit-author\nversion: 1\n---\n',
  })

  const { code, out } = await check(root)
  expect(code).toBe(0)
  expect(out).toContain('warning agents CB_SKILL_DRIFT')
  expect(out).toContain('contentbit-author skill is stale')
  expect(out).toContain('Re-run contentbit agents')
  expect((await check(root, ['--strict'])).code).toBe(1)
})

test('--watch cannot be combined with --json', async () => {
  const { code, out, err } = await check(await project(), ['--watch', '--json'])

  expect(code).toBe(2)
  expect(out).toBe('')
  expect(err).toBe('check: --watch cannot be combined with --json.')
})

test('--watch reruns after a content file appears in a new nested folder, and Ctrl+C stops it', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/**/*.md' }`,
    'content/current.md': '# Current\n',
  })

  const { code, reports } = await watchUntil(
    root,
    async () => {
      await mkdir(join(root, 'content/new-section'))
      await writeFile(join(root, 'content/new-section/new.md'), '# New\n')
    },
    (report) => /Markdown\s+2 files/.test(report),
  )
  expect(code).toBe(0)
  expect(reports[0]).toMatch(/Markdown\s+1 file\b/)
})

test('--watch reruns after a page in the build folder changes', async () => {
  const root = await project({ 'dist/index.html': page('https://example.com/') })

  const { reports } = await watchUntil(
    root,
    () =>
      writeFile(
        join(root, 'dist/index.html'),
        page('https://example.com/', '<h1>Home</h1><a href="/gone/">Gone</a>'),
      ),
    (report) => report.includes('error CB_LINK_PAGE_MISSING'),
  )
  expect(reports[0]).not.toContain('Built-page findings')
})

test('--watch reruns with an edited registry', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default { content: 'content/*.md', registry: './blocks/registry.mjs' }`,
    'content/post.md': ':::shout\nHEY\n:::\n',
    'blocks/registry.mjs': 'export default []\n',
  })

  const { reports } = await watchUntil(
    root,
    async () => {
      await writeFile(
        join(root, 'blocks/registry.mjs'),
        `import { defineBlock, markdownBody } from "${coreUrl}";
export default [defineBlock({ name: "shout", description: "Shouts.", content: markdownBody() })];
`,
      )
      await writeFile(join(root, 'content/post.md'), ':::shout\nHEY THERE\n:::\n')
    },
    (report) => /Errors\s+0/.test(report),
  )
  expect(reports[0]).toContain('CB_UNKNOWN_BLOCK')
  expect(reports.at(-1)).not.toContain('CB_UNKNOWN_BLOCK')
})

test('nothing to check is an input error', async () => {
  const { code, out, err } = await check(await project())

  expect(code).toBe(2)
  expect(out).toBe('')
  expect(err).toContain('check: nothing to check.')
})
