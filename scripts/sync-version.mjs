import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const packagePath = join(root, 'packages/core/package.json')
const versionPath = join(root, 'packages/core/src/version.ts')

const core = JSON.parse(await readFile(packagePath, 'utf8'))
const source = await readFile(versionPath, 'utf8')
const match = source.match(/VERSION\s*=\s*['"]([^'"]+)['"]/)

if (!match) {
  console.error('packages/core/src/version.ts does not export a literal VERSION.')
  process.exit(1)
}

const nextSource = source.replace(match[0], `VERSION = '${core.version}'`)

if (nextSource !== source) {
  await writeFile(versionPath, nextSource)
  console.log(`synced @contentbit/core VERSION to ${core.version}`)
} else {
  console.log(`@contentbit/core VERSION is already ${core.version}`)
}
