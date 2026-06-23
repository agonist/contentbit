import { readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packageDirs = ['astro', 'blocks', 'cli', 'core', 'html', 'react']

const packages = await Promise.all(
  packageDirs.map(async (dir) => {
    const path = join(root, 'packages', dir, 'package.json')
    const pkg = JSON.parse(await readFile(path, 'utf8'))
    return { dir, path, name: pkg.name, version: pkg.version }
  }),
)

const versions = new Map(packages.map((pkg) => [pkg.version, pkg]))
if (versions.size > 1) {
  console.error('contentbit package versions are out of sync:')
  for (const pkg of packages)
    console.error(`- ${pkg.name} (${basename(dirname(pkg.path))}): ${pkg.version}`)
  process.exitCode = 1
}

const core = packages.find((pkg) => pkg.dir === 'core')
const versionSource = await readFile(join(root, 'packages/core/src/version.ts'), 'utf8')
const match = versionSource.match(/VERSION\s*=\s*['"]([^'"]+)['"]/)

if (!match) {
  console.error('packages/core/src/version.ts does not export a literal VERSION.')
  process.exitCode = 1
} else if (core && match[1] !== core.version) {
  console.error(`@contentbit/core VERSION is ${match[1]}, but package.json is ${core.version}.`)
  process.exitCode = 1
}

if (!process.exitCode) {
  console.log(`all contentbit package versions are ${packages[0].version}`)
}
