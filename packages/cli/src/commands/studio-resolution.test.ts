import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build } from 'esbuild'
import { expect, test } from 'vitest'

const exec = promisify(execFile)
const cliRoot = fileURLToPath(new URL('../..', import.meta.url))

test('an isolated CLI loads Studio installed in the consuming project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cb-studio-resolution-'))
  try {
    const cli = join(root, 'cli')
    const project = join(root, 'project')
    const studio = join(project, 'node_modules', '@contentbit', 'studio')
    await mkdir(studio, { recursive: true })
    await mkdir(join(cli, 'node_modules', '@clack'), { recursive: true })
    await writeFile(join(cli, 'package.json'), JSON.stringify({ type: 'module' }))
    await writeFile(join(project, 'article.md'), '# Article\n\nBody.\n')
    await writeFile(
      join(studio, 'package.json'),
      JSON.stringify({
        name: '@contentbit/studio',
        type: 'module',
        exports: { '.': { import: './index.js' } },
      }),
    )
    await writeFile(
      join(studio, 'index.js'),
      'export async function startStudio() { return { url: "http://project-studio", close: async () => {}, closed: Promise.resolve() } }',
    )
    for (const name of ['tinyglobby', '@clack/prompts']) {
      await symlink(
        await realpath(join(cliRoot, 'node_modules', name)),
        join(cli, 'node_modules', name),
      )
    }
    await build({
      entryPoints: [join(cliRoot, 'src', 'bin.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: join(cli, 'bin.js'),
      loader: { '.md': 'text' },
      external: ['node:*', 'tinyglobby', '@clack/prompts', '@contentbit/studio'],
    })
    const result = await exec(
      process.execPath,
      [join(cli, 'bin.js'), 'studio', 'article.md', '--no-open'],
      {
        cwd: project,
      },
    )
    expect(result.stdout).toContain('http://project-studio')
    expect(result.stderr).toBe('')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
