import {
  analyzeDocument,
  parseDocument,
  stripFrontmatter,
  validateDocument,
  type DocumentStats,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

/** Stats plus a validation summary; a read tool, not a gate — always exits 0. */
type StatsOutput = DocumentStats & { validation?: { errors: number; warnings: number } }

export async function statsCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      'no-validate': { type: 'boolean', default: false },
    },
  })
  if (positionals.length !== 1) {
    io.stderr('stats: provide exactly one file.')
    return 2
  }
  const file = positionals[0]
  const source = await readFile(file, 'utf8')
  const stats: StatsOutput = analyzeDocument(source, { path: file })

  if (!values['no-validate']) {
    const registry = await loadRegistry(values.registry)
    const result = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    let errors = 0
    let warnings = 0
    for (const d of result.diagnostics) {
      if (d.severity === 'error') errors++
      else if (d.severity === 'warning') warnings++
    }
    stats.validation = { errors, warnings }
  }

  io.stdout(JSON.stringify(stats, null, 2))
  return 0
}
