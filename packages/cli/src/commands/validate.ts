import {
  extractFrontmatter,
  formatDiagnostic,
  parseDocument,
  stripFrontmatter,
  validateDocument,
  validateLinks,
  type LinkInput,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

export async function validateCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      'strict-warnings': { type: 'boolean', default: false },
    },
  })
  if (positionals.length === 0) {
    io.stderr('validate: provide at least one file or glob.')
    return 2
  }
  const files = await glob(positionals, { absolute: true })
  if (files.length === 0) {
    io.stderr(`validate: no files matched ${positionals.join(' ')}`)
    return 2
  }
  const registry = await loadRegistry(values.registry)

  let errors = 0
  let warnings = 0
  const linkInputs: LinkInput[] = []
  for (const file of files.sort()) {
    const source = await readFile(file, 'utf8')
    // Frontmatter is metadata, not content: blanked (positions preserved) so
    // block syntax inside YAML never produces diagnostics — matching what
    // frontmatter-aware consumers like Astro validate from entry bodies.
    linkInputs.push({ path: file, data: extractFrontmatter(source)?.data ?? {} })
    const result = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    for (const d of result.diagnostics) {
      io.stderr(formatDiagnostic(d, file))
      if (d.severity === 'error') errors++
      else if (d.severity === 'warning') warnings++
    }
  }

  // Cross-file internal-link checks, only when the project uses linking.
  if (linkInputs.some((i) => 'slug' in i.data)) {
    for (const { file, diagnostic } of validateLinks(linkInputs)) {
      io.stderr(formatDiagnostic(diagnostic, file))
      if (diagnostic.severity === 'error') errors++
      else if (diagnostic.severity === 'warning') warnings++
    }
  }

  io.stdout(`${files.length} file(s): ${errors} errors, ${warnings} warnings`)
  if (errors > 0) return 1
  if (warnings > 0 && values['strict-warnings']) return 1
  return 0
}
