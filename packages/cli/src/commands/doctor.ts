import {
  DEFAULT_MIN_SECTION_WORDS,
  type ContentProjectFinding,
  type LinkInput,
  type LinkResolverOptions,
} from '@contentbit/core'

import type { Io } from '../run.js'

import {
  color,
  displayPath,
  formatCommandList,
  formatRows,
  section,
  severityLabel,
} from '../cli-format.js'
import { loadContentProject } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'

type DoctorFinding = ContentProjectFinding

interface DoctorReport {
  files: number
  summary: { errors: number; warnings: number; suggestions: number }
  linkGraph?: { pages: number; links: number; orphans: number }
  seo?: {
    schemaVersion: string
    pages: number
    findings: DoctorFinding[]
  }
  findings: DoctorFinding[]
}

export interface DoctorCommandInput extends LinkOptionValues {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  strictWarnings?: boolean
  strictSeo?: boolean
  json?: boolean
  minSectionWords?: string
  seoConfig?: string
  noSeo?: boolean
}

export async function doctorCommand(input: DoctorCommandInput, io: Io): Promise<number> {
  const minSectionWords = parseMinSectionWords(input.minSectionWords)
  if (minSectionWords === null) {
    io.stderr('doctor: --min-section-words must be a non-negative integer.')
    return 2
  }

  const includeGenericBlocks = !input.noGenericBlocks
  const linkOptions = linkResolverOptions(input)
  const seoConfig = await loadSeoConfig({ seoConfig: input.seoConfig, noSeo: input.noSeo })
  const { files, scan } = await loadContentProject({
    cmd: 'doctor',
    positionals: input.globs,
    registry: input.registry,
    includeGenericBlocks,
    linkOptions,
    scan: { minSectionWords, seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
  })
  const report: DoctorReport = {
    files: files.length,
    summary: scan.summary,
    ...(scan.linkGraph ? { linkGraph: scan.linkGraph } : {}),
    ...(scan.seo
      ? {
          seo: {
            schemaVersion: scan.seo.schemaVersion,
            pages: scan.seo.pages.length,
            findings: scan.seo.findings,
          },
        }
      : {}),
    findings: scan.findings,
  }

  if (input.json) io.stdout(JSON.stringify(report, null, 2))
  else
    io.stdout(
      formatReport(
        report,
        input.globs,
        input.registry,
        includeGenericBlocks,
        linkOptions,
        hasAliases(scan.linkInputs),
      ),
    )

  if (report.summary.errors > 0) return 1
  if (report.summary.warnings > 0 && input.strictWarnings) return 1
  if (input.strictSeo && report.seo?.findings.some((finding) => finding.severity === 'warning')) {
    return 1
  }
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
  linkOptions: LinkResolverOptions,
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
  if (report.seo) {
    lines.push('')
    lines.push(section('SEO'))
    lines.push(
      ...formatRows([
        { label: 'Pages', value: report.seo.pages },
        {
          label: 'Findings',
          value: report.seo.findings.length,
          tone: report.seo.findings.length > 0 ? 'warning' : 'success',
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
  const registryArgs = formatRegistryArgs(registryPath, includeGenericBlocks)
  const linkArgs = formatLinkArgs(linkOptions)
  const commands = [`contentbit validate ${formatGlobs(globs)}${registryArgs}${linkArgs}`]
  if (report.linkGraph) {
    commands.push(`contentbit links ${formatGlobs(globs)}${linkArgs}`)
    if (aliasFixMayApply && report.summary.errors === 0)
      commands.push(`contentbit links ${formatGlobs(globs)}${linkArgs} --fix`)
  }
  commands.push(`contentbit doctor ${formatGlobs(globs)}${registryArgs}${linkArgs} --json`)
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

function formatLinkArgs(options: LinkResolverOptions): string {
  const args: string[] = []
  if (options.resolve) args.push('--link-resolve', options.resolve)
  if (options.localeField) args.push('--locale-field', formatArg(options.localeField))
  if (options.slugField) args.push('--slug-field', formatArg(options.slugField))
  if (options.keyField) args.push('--key-field', formatArg(options.keyField))
  if (options.defaultLocale) args.push('--default-locale', formatArg(options.defaultLocale))
  return args.length > 0 ? ` ${args.join(' ')}` : ''
}
