import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run, type Io } from './run'

export function fakeIo(): Io & { out: string[]; err: string[] } {
  const out: string[] = []
  const err: string[] = []
  return {
    out,
    err,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    writeFile: async () => {},
  }
}

test('no command prints usage and exits 2', async () => {
  const io = fakeIo()
  expect(await run([], io)).toBe(2)
  expect(io.err.join('\n')).toContain('Usage:')
  expect(io.err.join('\n')).toContain('links         build or fix the internal link index')
})

test('unknown command prints usage and exits 2', async () => {
  const io = fakeIo()
  expect(await run(['frobnicate'], io)).toBe(2)
})

test('render on a missing file exits 1 with a clean error, no stack trace', async () => {
  const io = fakeIo()
  expect(await run(['render', '/nonexistent/nope.md', '--target', 'html'], io)).toBe(1)
  expect(io.err.join('\n')).toContain('contentbit render')
  expect(io.err.join('\n')).toContain('error ENOENT')
  expect(io.err.join('\n')).not.toContain('    at ') // no stack frames
})

test('validate with a bad --registry path exits 1 with a clean error', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cb-'))
  await writeFile(join(dir, 'a.md'), ':::callout{type="tip"}\nWeigh your flour.\n:::\n', 'utf8')
  const io = fakeIo()
  expect(
    await run(['validate', join(dir, '*.md'), '--registry', '/nonexistent/registry.mjs'], io),
  ).toBe(1)
  expect(io.err.join('\n')).toContain('contentbit validate')
  expect(io.err.join('\n')).toContain('error Cannot find module')
})

test('an unrecognized flag exits 1 with a clean error', async () => {
  const io = fakeIo()
  expect(await run(['instructions', '--bogus-flag'], io)).toBe(1)
  expect(io.err.join('\n')).toContain('contentbit instructions')
  expect(io.err.join('\n')).toContain("error Unknown option '--bogus-flag'")
})
