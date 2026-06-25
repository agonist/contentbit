import { scanContentProject, type ContentProjectFinding, type Diagnostic } from '@contentbit/core'
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
  const sources = await Promise.all(
    files.sort().map(async (file) => ({ path: file, source: await readFile(file, 'utf8') })),
  )
  const scan = scanContentProject(sources, registry, {
    linkOptions,
    includeStatsFindings: false,
  })
  for (const finding of scan.findings) {
    io.stderr(formatDiagnosticForCli(diagnosticFromFinding(finding), finding.file))
    if (finding.severity === 'error') errors++
    else if (finding.severity === 'warning') warnings++
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

function diagnosticFromFinding(finding: ContentProjectFinding): Diagnostic {
  const line = finding.line ?? 1
  const column = finding.column ?? 1
  return {
    code: finding.code,
    severity: finding.severity,
    message: finding.message,
    ...(finding.hint ? { hint: finding.hint } : {}),
    position: {
      start: { line, column, offset: 0 },
      end: { line, column, offset: 0 },
    },
  }
}
