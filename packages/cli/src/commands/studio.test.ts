import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

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
