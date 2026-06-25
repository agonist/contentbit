import {
  DEFAULT_MIN_SECTION_WORDS,
  scanContentProject,
  type ContentProjectFinding,
  type LinkInput,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import {
  color,
  displayPath,
  formatCommandList,
  formatRows,
  section,
  severityLabel,
} from '../cli-format.js'
import { linkResolverOptions } from '../link-options.js'
import { loadRegistry } from '../load-registry.js'

type DoctorFinding = ContentProjectFinding

interface DoctorReport {
  files: number
  summary: { errors: number; warnings: number; suggestions: number }
  linkGraph?: { pages: number; links: number; orphans: number }
  findings: DoctorFinding[]
}

export async function doctorCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      'no-generic-blocks': { type: 'boolean', default: false },
      'strict-warnings': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      'min-section-words': { type: 'string' },
      'link-resolve': { type: 'string' },
      'locale-field': { type: 'string' },
      'slug-field': { type: 'string' },
      'key-field': { type: 'string' },
      'default-locale': { type: 'string' },
    },
  })
  if (positionals.length === 0) {
    io.stderr('doctor: provide at least one file or glob.')
    return 2
  }

  const minSectionWords = parseMinSectionWords(values['min-section-words'])
  if (minSectionWords === null) {
    io.stderr('doctor: --min-section-words must be a non-negative integer.')
    return 2
  }

  const files = (await glob(positionals, { absolute: true })).sort()
  if (files.length === 0) {
    io.stderr(`doctor: no files matched ${positionals.join(' ')}`)
    return 2
  }

  const includeGenericBlocks = !values['no-generic-blocks']
  const registry = await loadRegistry(values.registry, { includeGenericBlocks })
  const linkOptions = linkResolverOptions(values)
  const sources = await Promise.all(
    files.map(async (file) => ({ path: file, source: await readFile(file, 'utf8') })),
  )
  const scan = scanContentProject(sources, registry, { linkOptions, minSectionWords })
  const report: DoctorReport = {
    files: files.length,
    summary: scan.summary,
    ...(scan.linkGraph ? { linkGraph: scan.linkGraph } : {}),
    findings: scan.findings,
  }

  if (values.json) io.stdout(JSON.stringify(report, null, 2))
  else
    io.stdout(
      formatReport(
        report,
        positionals,
        values.registry,
        includeGenericBlocks,
        hasAliases(scan.linkInputs),
      ),
    )

  if (report.summary.errors > 0) return 1
  if (report.summary.warnings > 0 && values['strict-warnings']) return 1
  return 0
}

function parseMinSectionWords(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_MIN_SECTION_WORDS
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}

function hasAliases(inputs: LinkInput[]): boolean {
  return inputs.some((input) => Array.isArray(input.data.aliases) && input.data.aliases.length > 0)
}

function formatReport(
  report: DoctorReport,
  globs: string[],
  registryPath: string | undefined,
  includeGenericBlocks: boolean,
  aliasFixMayApply: boolean,
): string {
  const lines: string[] = []
  lines.push(section('contentbit doctor'))
  lines.push('')
  lines.push(section('Health'))
  lines.push(
    ...formatRows([
      { label: 'Files', value: report.files },
      {
        label: 'Errors',
        value: report.summary.errors,
        tone: report.summary.errors > 0 ? 'error' : 'success',
      },
      {
        label: 'Warnings',
        value: report.summary.warnings,
        tone: report.summary.warnings > 0 ? 'warning' : 'success',
      },
      {
        label: 'Suggestions',
        value: report.summary.suggestions,
        tone: report.summary.suggestions > 0 ? 'info' : 'success',
      },
    ]),
  )
  if (report.linkGraph) {
    lines.push('')
    lines.push(section('Link Graph'))
    lines.push(
      ...formatRows([
        { label: 'Pages', value: report.linkGraph.pages },
        { label: 'Links', value: report.linkGraph.links },
        {
          label: 'Orphans',
          value: report.linkGraph.orphans,
          tone: report.linkGraph.orphans > 0 ? 'warning' : 'success',
        },
      ]),
    )
  }
  lines.push('')

  if (report.findings.length === 0) {
    lines.push(color('No findings. Content looks healthy.', 'success'))
  } else {
    lines.push(section('Repair Plan'))
    report.findings.forEach((finding, index) => {
      lines.push(...formatFinding(index + 1, finding))
    })
  }

  lines.push('')
  lines.push(section('Next Commands'))
  const commands = [
    `contentbit validate ${formatGlobs(globs)}${formatRegistryArgs(registryPath, includeGenericBlocks)}`,
  ]
  if (report.linkGraph) {
    commands.push(`contentbit links ${formatGlobs(globs)}`)
    if (aliasFixMayApply && report.summary.errors === 0)
      commands.push(`contentbit links ${formatGlobs(globs)} --fix`)
  }
  commands.push(
    `contentbit doctor ${formatGlobs(globs)}${formatRegistryArgs(registryPath, includeGenericBlocks)} --json`,
  )
  lines.push(...formatCommandList(commands))
  return lines.join('\n')
}

function formatFinding(index: number, finding: DoctorFinding): string[] {
  const location =
    finding.line !== undefined && finding.column !== undefined
      ? `${displayPath(finding.file)}:${finding.line}:${finding.column}`
      : displayPath(finding.file)
  const lines = [
    `  ${index}. ${severityLabel(finding.severity)} ${finding.source} ${finding.code}`,
    `     ${color('at', 'muted')} ${location}`,
    `     ${finding.message}`,
  ]
  if (finding.hint) lines.push(`     ${color('hint', 'muted')} ${finding.hint}`)
  return lines
}

function formatGlobs(globs: string[]): string {
  return globs.map(formatArg).join(' ')
}

function formatArg(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value
}

function formatRegistryArgs(
  registryPath: string | undefined,
  includeGenericBlocks: boolean,
): string {
  const args: string[] = []
  if (registryPath) args.push('--registry', formatArg(registryPath))
  if (!includeGenericBlocks) args.push('--no-generic-blocks')
  return args.length > 0 ? ` ${args.join(' ')}` : ''
}
