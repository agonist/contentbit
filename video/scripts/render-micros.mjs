import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const compositions = [
  'MicroControlLayer',
  'MicroBriefBeforeDraft',
  'MicroDoctorRepair',
  'MicroLinkGraph',
  'MicroAdoptDryRun',
  'MicroOneContract',
]

mkdirSync('out/micros', { recursive: true })
const remotion = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'remotion.cmd' : 'remotion',
)

for (const composition of compositions) {
  const filename = composition
    .replace(/^Micro/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
  const result = spawnSync(
    remotion,
    ['render', composition, `out/micros/${filename}.mp4`, '--overwrite'],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
