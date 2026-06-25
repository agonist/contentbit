import { analyzeDocument, type DocumentStats } from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadContentProject, resolveContentFiles } from '../content-project.js'

/** Stats plus a validation summary; a read tool, not a gate — always exits 0. */
type StatsOutput = DocumentStats & { validation?: { errors: number; warnings: number } }

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

  const all = values['no-validate']
    ? await statsOnly(positionals)
    : await statsWithValidation(values, positionals)

  // A single file keeps the flat object shape; multiple files emit an array.
  io.stdout(JSON.stringify(all.length === 1 ? all[0] : all, null, 2))
  return 0
}

/** Default path: cross the loaded-content-project seam so stats and the other
 *  read-commands share one validation path. */
async function statsWithValidation(
  values: { registry?: string; 'no-generic-blocks': boolean },
  positionals: string[],
): Promise<StatsOutput[]> {
  const { scan } = await loadContentProject({
    cmd: 'stats',
    positionals,
    registry: values.registry,
    includeGenericBlocks: !values['no-generic-blocks'],
    linkOptions: {},
  })
  return scan.files.map((file) => {
    let errors = 0
    let warnings = 0
    for (const d of file.validation.diagnostics) {
      if (d.severity === 'error') errors++
      else if (d.severity === 'warning') warnings++
    }
    return { ...file.stats, validation: { errors, warnings } }
  })
}

/** `--no-validate`: stats only, no registry, no scan. */
async function statsOnly(positionals: string[]): Promise<StatsOutput[]> {
  const files = await resolveContentFiles(positionals, 'stats')
  return Promise.all(
    files.map(async (file) => analyzeDocument(await readFile(file, 'utf8'), { path: file })),
  )
}
