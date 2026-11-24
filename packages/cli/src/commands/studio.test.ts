import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { expect, test, vi } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

const studioMock = vi.hoisted(() => ({
  startStudio: vi.fn(),
}))

vi.mock('@contentbit/studio', () => ({
  startStudio: studioMock.startStudio,
}))

vi.mock('import-meta-resolve', () => ({
  resolve: () => {
    throw Object.assign(new Error("Cannot find package '@contentbit/studio'"), {
      code: 'ERR_MODULE_NOT_FOUND',
    })
  },
}))

async function writeFixture(dir: string, files: Record<string, string>): Promise<void> {
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true })
    await writeFile(join(dir, name), content, 'utf8')
  }
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

test('studio exits 2 with no input globs', async () => {
  const io = fakeIo()
  expect(await run(['studio'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('provide at least one file or glob')
})

test('studio exits 2 when no files match', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cb-studio-cli-'))
  const io = fakeIo()
  expect(await run(['studio', join(dir, '*.md'), '--no-open'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('no files matched')
})

test('studio validates port input before starting the server', async () => {
  const io = fakeIo()
  expect(await run(['studio', 'content/**/*.md', '--port', 'nope'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('--port must be an integer')
})

test('studio warns when it listens beyond the loopback interface', async () => {
  studioMock.startStudio.mockResolvedValue({
    url: 'http://0.0.0.0:3030/',
    close: async () => {},
    closed: Promise.resolve(),
  })
  const dir = await mkdtemp(join(tmpdir(), 'cb-studio-cli-'))
  await writeFile(join(dir, 'a.md'), 'Prose.\n', 'utf8')
  const start = async (host?: string) => {
    const io = fakeIo()
    const args = ['studio', join(dir, '*.md'), '--no-open', ...(host ? ['--host', host] : [])]
    expect(await run(args, io)).toBe(0)
    return io.err.join('\n')
  }

  expect(await start('0.0.0.0')).toContain('Studio is reachable from your network')
  expect(await start('192.168.1.20')).toContain('Studio is reachable from your network')
  for (const host of [undefined, '127.0.0.1', '127.0.0.2', 'localhost', '::1', '[::1]']) {
    expect(await start(host)).toBe('')
  }
})

test('studio forwards link resolver and generic block flags', async () => {
  studioMock.startStudio.mockResolvedValueOnce({
    url: 'http://127.0.0.1:3030',
    close: async () => {},
    closed: Promise.resolve(),
  })
  const dir = await mkdtemp(join(tmpdir(), 'cb-studio-cli-'))
  await writeFile(join(dir, 'a.md'), '---\nslug: a\n---\n\nProse.\n', 'utf8')

  const io = fakeIo()
  expect(
    await run(
      [
        'studio',
        join(dir, '*.md'),
        '--no-open',
        '--no-generic-blocks',
        '--link-resolve',
        'same-locale-key',
      ],
      io,
    ),
  ).toBe(0)

  expect(studioMock.startStudio).toHaveBeenCalledWith(
    expect.objectContaining({
      includeGenericBlocks: false,
      open: false,
      linkOptions: { resolve: 'same-locale-key' },
    }),
  )
})

test('studio with no globs reuses package script defaults from nested cwd', async () => {
  studioMock.startStudio.mockResolvedValueOnce({
    url: 'http://127.0.0.1:3030',
    close: async () => {},
    closed: Promise.resolve(),
  })
  const dir = await mkdtemp(join(tmpdir(), 'cb-studio-cli-'))
  await writeFixture(dir, {
    'package.json': JSON.stringify({
      scripts: {
        'content:check':
          'contentbit validate "content/**/*.md" --registry ./blocks/registry.mjs --no-generic-blocks',
      },
    }),
    'content/a.md': 'Prose.\n',
    'blocks/registry.mjs': 'export default [];\n',
  })
  const nested = join(dir, 'src')
  await mkdir(nested, { recursive: true })

  await withCwd(nested, async () => {
    expect(await run(['studio', '--no-open'], fakeIo())).toBe(0)
  })

  const resolvedDir = await realpath(dir)
  expect(studioMock.startStudio).toHaveBeenCalledWith(
    expect.objectContaining({
      cwd: resolvedDir,
      globs: ['content/**/*.md'],
      registryPath: './blocks/registry.mjs',
      includeGenericBlocks: false,
    }),
  )
})

test('studio forwards an explicit SEO config when project defaults disable SEO', async () => {
  studioMock.startStudio.mockResolvedValue({
    url: 'http://127.0.0.1:3030',
    close: async () => {},
    closed: Promise.resolve(),
  })
  const dir = await mkdtemp(join(tmpdir(), 'cb-studio-cli-'))
  await writeFixture(dir, {
    'contentbit.config.mjs': 'export default { content: ["content/*.md"], seo: false };\n',
    'explicit-seo.mjs': 'export default { pageTypes: {} };\n',
    'content/a.md': 'Prose.\n',
  })

  await withCwd(dir, async () => {
    expect(await run(['studio', '--seo-config', './explicit-seo.mjs', '--no-open'], fakeIo())).toBe(
      0,
    )
    expect(studioMock.startStudio).toHaveBeenLastCalledWith(
      expect.objectContaining({ seoConfig: { pageTypes: {} } }),
    )

    expect(
      await run(
        ['studio', '--seo-config', './explicit-seo.mjs', '--no-seo', '--no-open'],
        fakeIo(),
      ),
    ).toBe(0)
    expect(studioMock.startStudio).toHaveBeenLastCalledWith(
      expect.objectContaining({ seoConfig: undefined }),
    )
  })
})
