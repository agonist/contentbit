import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
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
  expect(await run(['render', '/nonexistent/nope.md'], io)).toBe(1)
  expect(io.err.join('\n')).toContain('contentbit render')
  expect(io.err.join('\n')).toContain('error ENOENT')
  expect(io.err.join('\n')).not.toContain('    at ') // no stack frames
})

test('validate with a bad --registry path exits 2 naming the missing module', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cb-'))
  await writeFile(join(dir, 'a.md'), ':::callout{type="tip"}\nWeigh your flour.\n:::\n', 'utf8')
  const io = fakeIo()
  expect(
    await run(['validate', join(dir, '*.md'), '--registry', '/nonexistent/registry.mjs'], io),
  ).toBe(2)
  expect(io.err.join('\n')).toContain('/nonexistent/registry.mjs')
  expect(io.err.join('\n')).not.toContain('Cannot find module')
})

test('help prints usage and exits 0', async () => {
  const io = fakeIo()
  expect(await run(['help'], io)).toBe(0)
  expect(io.out.join('\n')).toContain('Usage: contentbit')
  expect(io.err).toEqual([])

  const command = fakeIo()
  expect(await run(['help', 'validate'], command)).toBe(0)
  expect(command.out.join('\n')).toContain('--registry <module>')
  expect(command.err).toEqual([])
})

test.each(['--version', '-V'])('%s prints the package version and exits 0', async (flag) => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const io = fakeIo()
  expect(await run([flag], io)).toBe(0)
  expect(io.out).toEqual([pkg.version])
  expect(io.err).toEqual([])
})

test('an unrecognized flag exits 1 with a clean error', async () => {
  const io = fakeIo()
  expect(await run(['instructions', '--bogus-flag'], io)).toBe(1)
  expect(io.err.join('\n')).toContain('contentbit instructions')
  expect(io.err.join('\n')).toContain("error Unknown option '--bogus-flag'")
})

test('subcommand help explains options without requiring the website', async () => {
  const io = fakeIo()
  expect(await run(['doctor', '--help'], io)).toBe(0)
  const help = io.out.join('\n')
  expect(help).toContain('--registry <module>')
  expect(help).toContain('Load custom block definitions')
  expect(help).toContain('--strict-seo')
  expect(help).toContain('Treat required SEO findings as errors')
  expect(help).toContain('--watch')
  expect(help).toContain('Re-run when a scanned content directory changes')
})

test('enumerated options reject unknown values', async () => {
  const io = fakeIo()
  expect(await run(['instructions', '--audience', 'robot'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('Allowed choices are llm, human')
})
