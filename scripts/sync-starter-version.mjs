import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { syncStarterManifest } from './starter-version-state.mjs'

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('usage: pnpm starter:sync <published-version>')
  process.exit(2)
}

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const execFileAsync = promisify(execFile)
for (const starterDir of ['starter/astro', 'starter/tanstack']) {
  const cwd = join(root, starterDir)
  const packagePath = join(cwd, 'package.json')
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'))
  const next = syncStarterManifest(pkg, version)
  await writeFile(packagePath, `${JSON.stringify(next, null, 2)}\n`)
  await execFileAsync('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], {
    cwd,
    env: { ...process.env, CI: 'true' },
  })
  console.log(`synced ${starterDir} to published Contentbit ${version}`)
}
