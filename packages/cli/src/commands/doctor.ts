import {
  analyzeDocument,
  buildLinkIndex,
  extractFrontmatter,
  parseDocument,
  stripFrontmatter,
  validateDocument,
  validateLinks,
  type Diagnostic,
  type LinkInput,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { linkResolverOptions } from '../link-options.js'
import { loadRegistry } from '../load-registry.js'

type FindingSource = 'validation' | 'links' | 'stats'

interface DoctorFinding {
  severity: 'error' | 'warning' | 'info'
  source: FindingSource
  code: string
  file: string
  line?: number
  column?: number
  message: string
  hint?: string
}

interface DoctorReport {
  files: number
  summary: { errors: number; warnings: number; suggestions: number }
  linkGraph?: { pages: number; links: number; orphans: number }
  findings: DoctorFinding[]
}

const DEFAULT_MIN_SECTION_WORDS = 25
const BLOCKLESS_WORDS = 250

export async function doctorCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
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

  const registry = await loadRegistry(values.registry)
  const linkOptions = linkResolverOptions(values)
  const findings: DoctorFinding[] = []
  const linkInputs: LinkInput[] = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const frontmatter = extractFrontmatter(source)
    linkInputs.push({ path: file, data: frontmatter?.data ?? {} })

    const validation = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    for (const diagnostic of validation.diagnostics) {
      findings.push(findingFromDiagnostic('validation', file, diagnostic))
    }

    const stats = analyzeDocument(source, { path: file })
    for (const section of stats.outline) {
      if (section.words < minSectionWords) {
        findings.push({
          severity: 'info',
          source: 'stats',
          code: 'CB_THIN_SECTION',
          file,
          line: section.line,
          column: 1,
          message: `section "${section.text}" has ${section.words} words`,
          hint: `Add detail or merge it with a nearby section. Threshold: ${minSectionWords} words.`,
        })
      }
    }
    if (stats.length.words >= BLOCKLESS_WORDS && stats.blocks.total === 0) {
      findings.push({
        severity: 'info',
        source: 'stats',
        code: 'CB_BLOCKLESS_DOCUMENT',
        file,
        message: `document has ${stats.length.words} words and no structured blocks`,
        hint: 'Consider a callout, steps, comparison, FAQ, or another registered block if it clarifies the page.',
      })
    }
    if (stats.images.missingAlt > 0) {
      findings.push({
        severity: 'info',
        source: 'stats',
        code: 'CB_IMAGE_ALT_MISSING',
        file,
        message: `${stats.images.missingAlt} image(s) are missing alt text`,
        hint: 'Add descriptive alt text for meaningful images; use empty alt only for decorative images.',
      })
    }
  }

  let linkGraph: DoctorReport['linkGraph']
  if (hasLinkFrontmatter(linkInputs, linkOptions.slugField)) {
    for (const { file, diagnostic } of validateLinks(linkInputs, linkOptions)) {
      findings.push(findingFromDiagnostic('links', file, diagnostic))
    }
    const index = buildLinkIndex(linkInputs, linkOptions)
    let links = 0
    for (const page of index.pages.values()) links += page.linksTo.length
    linkGraph = {
      pages: index.pages.size,
      links,
      orphans: [...index.pages.values()].filter((page) => page.linkedFrom.length === 0).length,
    }
  }

  findings.sort(compareFindings)
  const report: DoctorReport = {
    files: files.length,
    summary: summarize(findings),
    ...(linkGraph ? { linkGraph } : {}),
    findings,
  }

  if (values.json) io.stdout(JSON.stringify(report, null, 2))
  else io.stdout(formatReport(report, positionals, values.registry, hasAliases(linkInputs)))

  if (report.summary.errors > 0) return 1
  if (report.summary.warnings > 0 && values['strict-warnings']) return 1
  return 0
}

function parseMinSectionWords(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_MIN_SECTION_WORDS
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}

function findingFromDiagnostic(
  source: Extract<FindingSource, 'validation' | 'links'>,
  file: string,
  diagnostic: Diagnostic,
): DoctorFinding {
  return {
    severity: diagnostic.severity,
    source,
    code: diagnostic.code,
    file,
    line: diagnostic.position.start.line,
    column: diagnostic.position.start.column,
    message: diagnostic.message,
    ...(diagnostic.hint ? { hint: diagnostic.hint } : {}),
  }
}

function hasLinkFrontmatter(inputs: LinkInput[], configuredSlugField: string | undefined): boolean {
  const slugField = configuredSlugField ?? 'slug'
  return inputs.some((input) => Object.prototype.hasOwnProperty.call(input.data, slugField))
}

function hasAliases(inputs: LinkInput[]): boolean {
  return inputs.some((input) => Array.isArray(input.data.aliases) && input.data.aliases.length > 0)
}

function summarize(findings: DoctorFinding[]): DoctorReport['summary'] {
  return {
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    suggestions: findings.filter((f) => f.severity === 'info').length,
  }
}

function compareFindings(a: DoctorFinding, b: DoctorFinding): number {
  return (
    rank(a) - rank(b) ||
    a.file.localeCompare(b.file) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.column ?? 0) - (b.column ?? 0) ||
    a.code.localeCompare(b.code)
  )
}

function rank(finding: DoctorFinding): number {
  if (finding.severity === 'error' && finding.source === 'validation') return 0
  if (finding.severity === 'error' && finding.source === 'links') return 1
  if (finding.severity === 'warning') return 2
  if (finding.code === 'CB_THIN_SECTION') return 3
  if (finding.code === 'CB_BLOCKLESS_DOCUMENT') return 4
  if (finding.code === 'CB_IMAGE_ALT_MISSING') return 5
  return 6
}

function formatReport(
  report: DoctorReport,
  globs: string[],
  registryPath: string | undefined,
  aliasFixMayApply: boolean,
): string {
  const lines: string[] = []
  lines.push('contentbit doctor')
  lines.push(
    `${report.files} file(s): ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.suggestions} suggestions`,
  )
  if (report.linkGraph) {
    lines.push(
      `${report.linkGraph.pages} linked page(s), ${report.linkGraph.links} link(s), ${report.linkGraph.orphans} orphan(s)`,
    )
  }
  lines.push('')

  if (report.findings.length === 0) {
    lines.push('No findings. Content looks healthy.')
  } else {
    lines.push('Repair plan:')
    report.findings.forEach((finding, index) => {
      lines.push(`${index + 1}. ${formatFinding(finding)}`)
      if (finding.hint) lines.push(`   hint: ${finding.hint}`)
    })
  }

  lines.push('')
  lines.push('Next commands:')
  lines.push(
    `- contentbit validate ${formatGlobs(globs)}${registryPath ? ` --registry ${formatArg(registryPath)}` : ''}`,
  )
  if (report.linkGraph) {
    lines.push(`- contentbit links ${formatGlobs(globs)}`)
    if (aliasFixMayApply && report.summary.errors === 0)
      lines.push(`- contentbit links ${formatGlobs(globs)} --fix`)
  }
  lines.push(`- contentbit doctor ${formatGlobs(globs)} --json`)
  return lines.join('\n')
}

function formatFinding(finding: DoctorFinding): string {
  const location =
    finding.line !== undefined && finding.column !== undefined
      ? `${finding.file}:${finding.line}:${finding.column}`
      : finding.file
  return `[${finding.severity}] ${finding.source} ${finding.code} ${location} - ${finding.message}`
}

function formatGlobs(globs: string[]): string {
  return globs.map(formatArg).join(' ')
}

function formatArg(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value
}
