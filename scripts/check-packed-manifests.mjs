import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const root = dirname(dirname(fileURLToPath(import.meta.url)))

const packageDirs = ['astro', 'blocks', 'cli', 'core', 'html', 'react', 'studio']
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]

const packDir = await mkdtemp(join(tmpdir(), 'contentbit-pack-check-'))
let failed = false

try {
  for (const packageDir of packageDirs) {
    const cwd = join(root, 'packages', packageDir)
    const manifest = await packedManifest(cwd)
    const leaks = workspaceRanges(manifest)

    if (leaks.length > 0) {
      failed = true
      console.error(
        `${manifest.name}@${manifest.version} has workspace ranges in its packed manifest:`,
      )
      for (const leak of leaks) console.error(`  - ${leak}`)
    } else {
      console.log(`ok ${manifest.name}@${manifest.version}`)
    }
  }
} finally {
  await rm(packDir, { recursive: true, force: true })
}

if (failed) {
  console.error('Packed manifests must not contain workspace: dependency ranges.')
  process.exit(1)
}

console.log('packed manifests are publish-safe')

async function packedManifest(cwd) {
  const { stdout } = await exec('pnpm', ['pack', '--json', '--pack-destination', packDir], {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
  })
  const packResult = JSON.parse(stdout.slice(stdout.indexOf('{')))
  const { stdout: manifest } = await exec('tar', [
    '-xOf',
    packResult.filename,
    'package/package.json',
  ])
  return JSON.parse(manifest)
}

function workspaceRanges(manifest) {
  const leaks = []

  for (const field of dependencyFields) {
    const dependencies = manifest[field] ?? {}

    for (const [name, range] of Object.entries(dependencies)) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        leaks.push(`${field}.${name}: ${range}`)
      }
    }
  }

  return leaks
}
