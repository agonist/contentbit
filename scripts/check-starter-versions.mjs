import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { starterVersionIssues } from './starter-version-state.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const starterDirs = ['starter/astro', 'starter/tanstack']

for (const starterDir of starterDirs) {
  const [manifestSource, lockfile] = await Promise.all([
    readFile(join(root, starterDir, 'package.json'), 'utf8'),
    readFile(join(root, starterDir, 'pnpm-lock.yaml'), 'utf8'),
  ])
  const issues = starterVersionIssues(JSON.parse(manifestSource), lockfile)
  for (const issue of issues) console.error(`${starterDir}: ${issue}`)
  if (issues.length > 0) process.exitCode = 1
}

if (!process.exitCode) console.log('standalone starter manifests and lockfiles are coherent')
