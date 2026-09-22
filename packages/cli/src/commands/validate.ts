import { type ContentProjectFinding, type Diagnostic } from '@contentbit/core'

import type { Io } from '../run.js'

import { resolveContentCommandConfig } from '../command-config.js'
import { formatDiagnosticForCli, formatRows, section } from '../cli-format.js'
import { loadContentProject } from '../content-project.js'
import type { LinkOptionValues } from '../link-options.js'

export interface ValidateCommandInput extends LinkOptionValues {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  strictWarnings?: boolean
}

export async function validateCommand(input: ValidateCommandInput, io: Io): Promise<number> {
  const config = await resolveContentCommandConfig('validate', input)
  const linkOptions = config.resolveLinkOptions()
  const { files, scan } = await loadContentProject({
    cmd: 'validate',
    positionals: config.globs,
    cwd: config.cwd,
    registry: config.registry,
    includeGenericBlocks: config.includeGenericBlocks,
    linkOptions,
    scan: { includeStatsFindings: false, includeIntegrityFindings: false },
  })

  let errors = 0
  let warnings = 0
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
  if (warnings > 0 && input.strictWarnings) return 1
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
