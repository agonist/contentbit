import {
  analyzeDocument,
  parseDocument,
  stripFrontmatter,
  validateDocument,
  type BlockRegistry,
  type DocumentStats,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

/** Stats plus a validation summary; a read tool, not a gate — always exits 0. */
type StatsOutput = DocumentStats & { validation?: { errors: number; warnings: number } }

async function fileStats(file: string, registry: BlockRegistry | null): Promise<StatsOutput> {
  const source = await readFile(file, 'utf8')
  const stats: StatsOutput = analyzeDocument(source, { path: file })
  if (registry) {
    const result = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    let errors = 0
    let warnings = 0
    for (const d of result.diagnostics) {
      if (d.severity === 'error') errors++
      else if (d.severity === 'warning') warnings++
    }
    stats.validation = { errors, warnings }
  }
  return stats
}

export async function statsCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      'no-generic-blocks': { type: 'boolean', default: false },
      'no-validate': { type: 'boolean', default: false },
    },
  })
  if (positionals.length === 0) {
    io.stderr('stats: provide at least one file or glob.')
    return 2
  }
  const files = await glob(positionals, { absolute: true })
  if (files.length === 0) {
    io.stderr(`stats: no files matched ${positionals.join(' ')}`)
    return 2
  }
  const registry = values['no-validate']
    ? null
    : await loadRegistry(values.registry, { includeGenericBlocks: !values['no-generic-blocks'] })

  const all: StatsOutput[] = []
  for (const file of files.sort()) {
    all.push(await fileStats(file, registry))
  }
  // A single file keeps the flat object shape; multiple files emit an array.
  io.stdout(JSON.stringify(all.length === 1 ? all[0] : all, null, 2))
  return 0
}
