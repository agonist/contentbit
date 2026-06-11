import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function project(pkg: object): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-init-'))
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8')
  return dir
}

test('init scaffolds a react project non-interactively', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)

  await expect(readFile(join(dir, 'blocks/registry.mjs'), 'utf8')).resolves.toContain(
    'export default []',
  )
  await expect(readFile(join(dir, 'content/example.md'), 'utf8')).resolves.toContain(':::steps')
  await expect(readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')).resolves.toContain(
    'ContentBlocks',
  )
  await expect(readFile(join(dir, 'contentbit-guide.md'), 'utf8')).resolves.toContain(':::callout')

  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  expect(pkg.scripts['content:check']).toContain('contentbit validate')
  expect(io.out.join('\n')).toContain('Next steps')
})

test('react init wires react-markdown by default and installs it', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)
  const component = await readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')
  expect(component).toContain('ReactMarkdown')
  expect(component).not.toContain('TODO')
  expect(io.out.join('\n')).toContain('react-markdown')
})

test('--md none scaffolds the unwired component', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  expect(await run(['init', '-y', '--md', 'none', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  const component = await readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')
  expect(component).toContain('TODO')
})

test('html init scaffolds a wired render script', async () => {
  const dir = await project({ name: 'x' })
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  const script = await readFile(join(dir, 'scripts/render-example.mjs'), 'utf8')
  expect(script).toContain("from 'marked'")
  expect(script).toContain('renderToHtml')
})

test('init rejects an unknown markdown library', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  const io = fakeIo()
  expect(await run(['init', '--md', 'remarkable', '--no-install', '--cwd', dir], io)).toBe(2)
  expect(io.err.join('\n')).toContain('Unknown markdown library')
})

test('init without react defaults to the html target', async () => {
  const dir = await project({ name: 'x' })
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  // No react component scaffolded for the html target.
  await expect(readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')).rejects.toThrow()
})

test('init is idempotent and never overwrites existing files', async () => {
  const dir = await project({ name: 'x' })
  await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())
  await writeFile(join(dir, 'content/example.md'), 'edited by the user\n', 'utf8')

  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)
  await expect(readFile(join(dir, 'content/example.md'), 'utf8')).resolves.toBe(
    'edited by the user\n',
  )
  expect(io.out.join('\n')).toContain('skipped: content/example.md')
})

test('the scaffolded example content validates', async () => {
  const dir = await project({ name: 'x' })
  await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())
  const io = fakeIo()
  expect(await run(['validate', join(dir, 'content/*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('0 errors')
})

test('init rejects an unknown target', async () => {
  const dir = await project({ name: 'x' })
  const io = fakeIo()
  expect(await run(['init', '-t', 'vue', '--no-install', '--cwd', dir], io)).toBe(2)
  expect(io.err.join('\n')).toContain('Unknown target')
})

test('init fails cleanly without a package.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cb-init-empty-'))
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(1)
  expect(io.err.join('\n')).toContain('No package.json')
})
