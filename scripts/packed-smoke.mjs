import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temp = await mkdtemp(join(tmpdir(), 'contentbit-packed-'))
const packageDirs = ['core', 'blocks', 'react', 'astro', 'cli', 'studio']
const artifacts = new Map()
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

async function run(command, args, cwd, env = {}) {
  console.log(`[packed] ${basename(cwd)}: ${command} ${args.join(' ')}`)
  try {
    const result = await exec(command, args, {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 300_000,
      env: { ...process.env, CI: 'true', NEXT_TELEMETRY_DISABLED: '1', ...env },
    })
    if (result.stdout) console.log(result.stdout.trim())
    return result.stdout
  } catch (error) {
    if (error.stdout) console.error(error.stdout)
    if (error.stderr) console.error(error.stderr)
    throw error
  }
}

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

async function install(dir) {
  const workspacePath = join(dir, 'pnpm-workspace.yaml')
  const config = await readFile(workspacePath, 'utf8')
  const overrides = [...artifacts].map(
    ([name, artifact]) => `  ${JSON.stringify(name)}: ${JSON.stringify(`file:${artifact.path}`)}`,
  )
  await writeFile(workspacePath, `${config}\noverrides:\n${overrides.join('\n')}\n`)
  // Keep each starter's lockfile as the dependency baseline; only the temporary
  // copy is updated to point all direct AND transitive Contentbit deps at tarballs.
  await run(pnpm, ['install', '--no-frozen-lockfile'], dir)
  // The starter's formatting gate also checks this generated override file.
  if (dir.includes(`${temp}/starter/`))
    await run(pnpm, ['exec', 'oxfmt', 'pnpm-workspace.yaml'], dir)
  const pkg = await json(join(dir, 'package.json'))
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    const artifact = artifacts.get(name)
    if (!artifact) continue
    const installed = join(dir, 'node_modules', name)
    assert(!(await realpath(installed)).startsWith(`${root}/`), `${name} linked to workspace`)
    assert.equal((await json(join(installed, 'package.json'))).version, artifact.version)
    const entry = artifact.entry
    assert.equal(
      await readFile(join(installed, entry), 'utf8'),
      await readFile(join(artifact.source, entry), 'utf8'),
      `${name} did not install the candidate build`,
    )
  }
}

async function cli(dir, args, env) {
  return run(
    process.execPath,
    [join(dir, 'node_modules/contentbit/dist/bin.js'), ...args],
    dir,
    env,
  )
}

// pnpm add resolves explicit package versions before applying file overrides.
// Serve real candidate metadata so init can install an unpublished RC. Other
// packages still come from npm; nothing is published by this test registry.
async function candidateRegistry() {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname.slice(1))
    const artifact = artifacts.get(path)
    if (artifact) {
      const tarball = `http://127.0.0.1:${server.address().port}/tarballs/${basename(artifact.path)}`
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          name: path,
          'dist-tags': { latest: artifact.version, rc: artifact.version },
          versions: {
            [artifact.version]: {
              ...artifact.manifest,
              dist: { tarball, integrity: artifact.integrity },
            },
          },
        }),
      )
      return
    }
    const tarball = [...artifacts.values()].find(
      (entry) => path === `tarballs/${basename(entry.path)}`,
    )
    if (tarball) {
      createReadStream(tarball.path).pipe(response)
      return
    }
    response.writeHead(302, { Location: `https://registry.npmjs.org${request.url}` })
    response.end()
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  }
}

async function studio(dir, flags = []) {
  await cp(join(root, 'scripts/packed-studio-smoke.mjs'), join(dir, 'packed-studio-smoke.mjs'))
  await run(process.execPath, ['packed-studio-smoke.mjs', ...flags], dir)
  await rm(join(dir, 'packed-studio-smoke.mjs'))
}

async function starter(name) {
  const dir = join(temp, 'starter', name)
  await cp(join(root, 'starter', name), dir, {
    recursive: true,
    filter: (path) =>
      !['node_modules', 'dist', '.astro', '.tanstack', '.contentbit', '.git'].includes(
        basename(path),
      ),
  })
  await install(dir)
  // Full standalone gates include validation, links, Doctor, types, production
  // rendering, and assertions about generated pages and block markup.
  await run(pnpm, ['check'], dir)
  await studio(dir, name === 'tanstack' ? ['--styled', '--quote'] : [])
}

async function nextProject() {
  const dir = join(temp, 'next')
  await mkdir(join(dir, 'src/app'), { recursive: true })
  const version = async (workspace, name) =>
    (await json(join(root, workspace, 'node_modules', name, 'package.json'))).version
  const dependencies = Object.fromEntries(
    [
      'contentbit',
      '@contentbit/core',
      '@contentbit/blocks',
      '@contentbit/react',
      '@contentbit/studio',
    ].map((name) => [name, artifacts.get(name).version]),
  )
  Object.assign(dependencies, {
    next: await version('site', 'next'),
    react: await version('packages/studio', 'react'),
    'react-dom': await version('packages/studio', 'react-dom'),
    'react-markdown': await version('packages/studio', 'react-markdown'),
    zod: await version('packages/core', 'zod'),
  })
  await writeJson(join(dir, 'package.json'), {
    name: 'contentbit-packed-next',
    private: true,
    type: 'module',
    dependencies,
    devDependencies: {
      typescript: await version('site', 'typescript'),
      '@types/node': await version('site', '@types/node'),
      '@types/react': await version('packages/studio', '@types/react'),
      '@types/react-dom': await version('packages/studio', '@types/react-dom'),
    },
  })
  await writeFile(
    join(dir, 'pnpm-workspace.yaml'),
    'packages: []\nminimumReleaseAge: 0\nallowBuilds:\n  sharp: true\n  esbuild: true\n',
  )
  await writeFile(
    join(dir, 'src/app/layout.tsx'),
    'export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html> }\n',
  )
  await install(dir)
  const registry = await candidateRegistry()
  try {
    await cli(dir, ['init', '--target', 'react', '--seo', '--no-agents', '--no-styled', '-y'], {
      npm_config_registry: registry.url,
    })
  } finally {
    await registry.close()
  }
  await cli(dir, ['validate'])
  const doctor = JSON.parse(await cli(dir, ['doctor', '--json', '--strict-seo']))
  assert.equal(doctor.summary.errors, 0)
  const rendered = await cli(dir, ['render', 'content/example.md'])
  assert(
    rendered.includes('The Analytical Engine weaves algebraic patterns'),
    'custom block missing from Markdown export',
  )
  assert(!rendered.includes(':::quote'), 'custom block was not rendered')
  await run(pnpm, ['exec', 'next', 'build', '--webpack'], dir)
  const page = await readFile(join(dir, '.next/server/app/example.html'), 'utf8')
  assert(page.includes('Ada Lovelace'), 'generated Next page did not render the custom block')
  assert(page.includes('Hello, Content Blocks'), 'generated Next page did not render Markdown')
  await studio(dir, ['--quote'])
}

try {
  const packDir = join(temp, 'packs')
  await mkdir(packDir)
  for (const name of packageDirs) {
    const source = join(root, 'packages', name)
    const manifest = await json(join(source, 'package.json'))
    const stdout = await run(pnpm, ['pack', '--json', '--pack-destination', packDir], source)
    const result = JSON.parse(stdout.slice(stdout.indexOf('{')))
    const { stdout: packedManifest } = await exec('tar', [
      '-xOf',
      result.filename,
      'package/package.json',
    ])
    artifacts.set(manifest.name, {
      path: result.filename,
      version: manifest.version,
      manifest: JSON.parse(packedManifest),
      integrity: `sha512-${createHash('sha512')
        .update(await readFile(result.filename))
        .digest('base64')}`,
      source,
      entry: manifest.exports['.'].import.replace(/^\.\//, ''),
    })
  }
  await mkdir(join(temp, 'scripts'))
  await cp(join(root, 'scripts/starter-smoke.mjs'), join(temp, 'scripts/starter-smoke.mjs'))
  await starter('astro')
  await starter('tanstack')
  await nextProject()
  console.log('[packed] Astro, TanStack, Next init, and installed Studio passed')
} finally {
  if (process.argv.includes('--keep')) console.log(`[packed] retained consumers: ${temp}`)
  else await rm(temp, { recursive: true, force: true })
}
