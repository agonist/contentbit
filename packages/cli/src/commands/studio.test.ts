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
