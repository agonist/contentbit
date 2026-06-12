import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function project(pkg: object): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-init-'))
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8')
  return dir
}

/** Make @contentbit/* and zod resolvable from the temp project, as a real install would. */
async function linkModules(dir: string): Promise<void> {
  const root = fileURLToPath(new URL('../../../..', import.meta.url))
  await mkdir(join(dir, 'node_modules/@contentbit'), { recursive: true })
  for (const name of ['core', 'blocks']) {
    await symlink(join(root, 'packages', name), join(dir, 'node_modules/@contentbit', name))
  }
  await symlink(join(root, 'packages/core/node_modules/zod'), join(dir, 'node_modules/zod'))
}

test('init scaffolds a react project non-interactively', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)

  await expect(readFile(join(dir, 'blocks/registry.ts'), 'utf8')).resolves.toContain(
    "name: 'quote'",
  )
  await expect(readFile(join(dir, 'content/example.md'), 'utf8')).resolves.toContain(':::quote')
  const component = await readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')
  expect(component).toContain('ContentBlocks')
  expect(component).toContain('blockComponents')
  await expect(readFile(join(dir, 'blocks/components.tsx'), 'utf8')).resolves.toContain(
    'QuoteBlock',
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

test('tanstack projects get the component and an example route in src/', async () => {
  const dir = await project({
    name: 'x',
    dependencies: { react: '^19.0.0', '@tanstack/react-router': '^1.0.0' },
  })
  await mkdir(join(dir, 'src/routes'), { recursive: true })
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  const route = await readFile(join(dir, 'src/routes/example.tsx'), 'utf8')
  expect(route).toContain("createFileRoute('/example')")
  expect(route).toContain('example.md?raw')
  await expect(readFile(join(dir, 'src/components/content-blocks.tsx'), 'utf8')).resolves.toContain(
    'ReactMarkdown',
  )
})

test('next projects get an app-router page reading the file', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0', next: '^16.0.0' } })
  await mkdir(join(dir, 'app'), { recursive: true })
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  const page = await readFile(join(dir, 'app/example/page.tsx'), 'utf8')
  expect(page).toContain('readFile')
  const component = await readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')
  expect(component).toContain("'use client'")
})

test('--no-page skips the route scaffold', async () => {
  const dir = await project({
    name: 'x',
    dependencies: { react: '^19.0.0', '@tanstack/react-router': '^1.0.0' },
  })
  await mkdir(join(dir, 'src/routes'), { recursive: true })
  expect(await run(['init', '-y', '--no-page', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  await expect(readFile(join(dir, 'src/routes/example.tsx'), 'utf8')).rejects.toThrow()
})

test('shadcn projects get the registry namespace and a styled wrapper', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  await writeFile(
    join(dir, 'components.json'),
    JSON.stringify({ style: 'new-york', aliases: { components: '@/components' } }),
    'utf8',
  )
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)
  const componentsJson = JSON.parse(await readFile(join(dir, 'components.json'), 'utf8'))
  expect(componentsJson.registries['@contentbit']).toContain('contentbit.dev')
  const wrapper = await readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')
  expect(wrapper).toContain('ContentRenderer')
})

test('--no-styled keeps the headless wrapper in shadcn projects', async () => {
  const dir = await project({ name: 'x', dependencies: { react: '^19.0.0' } })
  await writeFile(join(dir, 'components.json'), '{}', 'utf8')
  expect(await run(['init', '-y', '--no-styled', '--no-install', '--cwd', dir], fakeIo())).toBe(0)
  const wrapper = await readFile(join(dir, 'components/content-blocks.tsx'), 'utf8')
  expect(wrapper).toContain('ContentBlocks')
  expect(wrapper).not.toContain('ContentRenderer')
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

test('the scaffolded content validates against the scaffolded registry', async () => {
  const dir = await project({ name: 'x' })
  await linkModules(dir) // simulate the install so registry.mjs is importable
  await run(['init', '-y', '--no-install', '--cwd', dir], fakeIo())
  // vite-node cannot follow loadRegistry's dynamic import of a scaffolded
  // module, so this one runs end to end against the built binary.
  const bin = fileURLToPath(new URL('../../dist/bin.js', import.meta.url))
  if (!existsSync(bin)) {
    execFileSync('pnpm', ['build'], { cwd: fileURLToPath(new URL('../..', import.meta.url)) })
  }
  const out = execFileSync(
    'node',
    [bin, 'validate', join(dir, 'content/*.md'), '--registry', join(dir, 'blocks/registry.ts')],
    { encoding: 'utf8' },
  )
  expect(out).toContain('0 errors')
  // With modules resolvable, the generated guide covers the custom block too.
  await expect(readFile(join(dir, 'contentbit-guide.md'), 'utf8')).resolves.toContain(':::quote')
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

test('init scaffolds an astro project non-interactively', async () => {
  // astro outranks react when both are present
  const dir = await project({
    name: 'x',
    dependencies: { astro: '^6.0.0', react: '^19.0.0' },
  })
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)

  const config = await readFile(join(dir, 'src/content.config.ts'), 'utf8')
  expect(config).toContain("import { glob } from 'astro/loaders'")
  expect(config).toContain('defineCollection')
  const page = await readFile(join(dir, 'src/pages/example.astro'), 'utf8')
  expect(page).toContain("from '@contentbit/astro/components'")
  expect(page).toContain("getEntry('articles', 'example')")
  expect(page).toContain('validateDocument(parseDocument(entry.body), registry)')
  expect(page).toContain('QuoteBlock')
  await expect(readFile(join(dir, 'blocks/QuoteBlock.astro'), 'utf8')).resolves.toContain(
    'Astro.props',
  )
  await expect(readFile(join(dir, 'content/example.md'), 'utf8')).resolves.toContain(':::quote')
  expect(io.out.join('\n')).toContain('@contentbit/astro')
  expect(io.out.join('\n')).toContain('Next steps')
})

test('astro init leaves an existing content config alone and prints the snippet', async () => {
  const dir = await project({ name: 'x', dependencies: { astro: '^6.0.0' } })
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(join(dir, 'src/content.config.ts'), 'export const collections = {}\n', 'utf8')
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)

  await expect(readFile(join(dir, 'src/content.config.ts'), 'utf8')).resolves.toBe(
    'export const collections = {}\n',
  )
  expect(io.out.join('\n')).toContain('add this collection manually')
  expect(io.out.join('\n')).toContain('glob(')
})

test('astro init recognizes a content config Astro resolves before .ts', async () => {
  const dir = await project({ name: 'x', dependencies: { astro: '^6.0.0' } })
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(join(dir, 'src/content.config.mts'), 'export const collections = {}\n', 'utf8')
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)

  // No second config that Astro would silently ignore.
  await expect(readFile(join(dir, 'src/content.config.ts'), 'utf8')).rejects.toThrow()
  expect(io.out.join('\n')).toContain('content config exists (src/content.config.mts)')
})

test('--target astro works in a project without astro installed', async () => {
  const dir = await project({ name: 'x' })
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--target', 'astro', '--cwd', dir], io)).toBe(0)
  await expect(readFile(join(dir, 'src/content.config.ts'), 'utf8')).resolves.toContain('glob(')
})

test('astro init in a shadcn project installs the astro pack and uses ContentRenderer', async () => {
  const dir = await project({ name: 'x', dependencies: { astro: '^6.0.0' } })
  await writeFile(join(dir, 'components.json'), '{}', 'utf8')
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)

  expect(io.out.join('\n')).toContain('skipped: shadcn add @contentbit/astro-pack')
  const componentsJson = JSON.parse(await readFile(join(dir, 'components.json'), 'utf8'))
  expect(componentsJson.registries['@contentbit']).toBe('https://contentbit.dev/r/{name}.json')
  const page = await readFile(join(dir, 'src/pages/example.astro'), 'utf8')
  expect(page).toContain('ContentRenderer')
  expect(page).toContain('../components/content-blocks/content-renderer.astro')
  // The pack install was skipped, so the next steps must say how to get it.
  expect(io.out.join('\n')).toContain('shadcn@latest add @contentbit/astro-pack')
})

test('astro init without components.json stays headless', async () => {
  const dir = await project({ name: 'x', dependencies: { astro: '^6.0.0' } })
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--cwd', dir], io)).toBe(0)
  const page = await readFile(join(dir, 'src/pages/example.astro'), 'utf8')
  expect(page).toContain("import { ContentBlocks } from '@contentbit/astro/components'")
  expect(page).not.toContain('ContentRenderer')
})

test('astro init with --no-styled stays headless even with components.json', async () => {
  const dir = await project({ name: 'x', dependencies: { astro: '^6.0.0' } })
  await writeFile(join(dir, 'components.json'), '{}', 'utf8')
  const io = fakeIo()
  expect(await run(['init', '-y', '--no-install', '--no-styled', '--cwd', dir], io)).toBe(0)
  const page = await readFile(join(dir, 'src/pages/example.astro'), 'utf8')
  expect(page).not.toContain('ContentRenderer')
})
