import {
  buildLinkIndex,
  formatDiagnostic,
  serializeLinkIndex,
  validateLinks,
} from '@contentbit/core'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { collectLinkInputs } from '../links-io.js'

export async function linksCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      fix: { type: 'boolean', default: false },
    },
  })
  if (positionals.length === 0) {
    io.stderr('links: provide at least one file or glob.')
    return 2
  }
  const files = (await glob(positionals, { absolute: true })).sort()
  if (files.length === 0) {
    io.stderr(`links: no files matched ${positionals.join(' ')}`)
    return 2
  }

  const inputs = await collectLinkInputs(files)

  let errors = 0
  let warnings = 0
  for (const { file, diagnostic } of validateLinks(inputs)) {
    io.stderr(formatDiagnostic(diagnostic, file))
    if (diagnostic.severity === 'error') errors++
    else if (diagnostic.severity === 'warning') warnings++
  }

  const index = buildLinkIndex(inputs)
  const outPath = values.out ?? join(process.cwd(), '.contentbit', 'link-index.json')
  await io.writeFile(outPath, JSON.stringify(serializeLinkIndex(index), null, 2) + '\n')

  let edges = 0
  for (const p of index.pages.values()) edges += p.linksTo.length
  const orphans = [...index.pages.values()].filter((p) => p.linkedFrom.length === 0).length
  io.stdout(
    `${index.pages.size} page(s), ${edges} link(s), ${orphans} orphan(s): ${errors} errors, ${warnings} warnings`,
  )
  io.stdout(`index written to ${outPath}`)
  return errors > 0 ? 1 : 0
}
