import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, vi } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

const studioMock = vi.hoisted(() => ({
  startStudio: vi.fn(),
}))

vi.mock('@contentbit/studio', () => ({
  startStudio: studioMock.startStudio,
}))

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
