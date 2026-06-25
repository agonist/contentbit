import {
  extractFrontmatter,
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

import { formatDiagnosticForCli, formatRows, section } from '../cli-format.js'
import { linkResolverOptions } from '../link-options.js'
import { loadRegistry } from '../load-registry.js'

export async function validateCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      'no-generic-blocks': { type: 'boolean', default: false },
      'strict-warnings': { type: 'boolean', default: false },
      'link-resolve': { type: 'string' },
      'locale-field': { type: 'string' },
      'slug-field': { type: 'string' },
      'key-field': { type: 'string' },
      'default-locale': { type: 'string' },
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
  const registry = await loadRegistry(values.registry, {
    includeGenericBlocks: !values['no-generic-blocks'],
  })
  const linkOptions = linkResolverOptions(values)

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
      io.stderr(formatDiagnosticForCli(d, file))
      if (d.severity === 'error') errors++
      else if (d.severity === 'warning') warnings++
    }
  }

  // Cross-file internal-link checks, only when the project uses linking.
  if (linkInputs.some((i) => 'slug' in i.data)) {
    for (const { file, diagnostic } of validateLinks(linkInputs, linkOptions)) {
      io.stderr(formatDiagnosticForCli(diagnostic, file))
      if (diagnostic.severity === 'error') errors++
      else if (diagnostic.severity === 'warning') warnings++
    }
  }

  io.stdout(
    [
      section('Validation'),
      ...formatRows([
        { label: 'Files', value: files.length },
        { label: 'Errors', value: errors, tone: errors > 0 ? 'error' : 'success' },
        { label: 'Warnings', value: warnings, tone: warnings > 0 ? 'warning' : 'success' },
      ]),
    ].join('\n'),
  )
  if (errors > 0) return 1
  if (warnings > 0 && values['strict-warnings']) return 1
  return 0
}
