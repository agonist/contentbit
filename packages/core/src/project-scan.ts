import type { Diagnostic } from './diagnostics.js'
import type { LinkDiagnostic, LinkIndex, LinkInput, LinkResolverOptions } from './links.js'
import type { BlockRegistry } from './registry.js'
import type { DocumentStats } from './analyze.js'
import type { ValidationResult } from './validate.js'

import { analyzeDocument } from './analyze.js'
import { compileDocument } from './compile.js'
import { extractFrontmatter } from './frontmatter.js'
import { createLinkGraphView, type LinkGraphSummary } from './link-graph.js'
import { buildLinkIndex, validateLinks } from './links.js'
import { evaluateSeoProject, type SeoProjectEvaluation } from './seo.js'
import { scanContentIntegrity } from './content-integrity.js'

export type ContentProjectFindingSource = 'validation' | 'links' | 'stats' | 'integrity' | 'seo'

export interface ContentProjectSourceFile {
  path: string
  source: string
}

export interface ContentProjectFinding {
  severity: Diagnostic['severity']
  source: ContentProjectFindingSource
  code: string
  file: string
  line?: number
  column?: number
  message: string
  hint?: string
}

export interface ContentProjectFindingSummary {
  errors: number
  warnings: number
  suggestions: number
}

export interface ContentProjectFileScan {
  path: string
  source: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
  validation: ValidationResult
  findings: ContentProjectFinding[]
}

export type ContentProjectLinkGraph = LinkGraphSummary

export interface ContentProjectScan {
  files: ContentProjectFileScan[]
  findings: ContentProjectFinding[]
  summary: ContentProjectFindingSummary
  linkInputs: LinkInput[]
  linkDiagnostics?: LinkDiagnostic[]
  linkIndex?: LinkIndex
  linkGraph?: ContentProjectLinkGraph
  seo?: SeoProjectEvaluation
}

export interface ScanContentProjectOptions {
  linkOptions?: LinkResolverOptions
  minSectionWords?: number
  includeStatsFindings?: boolean
  /** Include cross-document page-quality findings. Defaults to true for Doctor and Studio. */
  includeIntegrityFindings?: boolean
  seoConfig?: unknown
  seoConfigPath?: string
}

export const DEFAULT_MIN_SECTION_WORDS = 25
const BLOCKLESS_WORDS = 250

export function scanContentProject(
  files: ContentProjectSourceFile[],
  registry: BlockRegistry,
  options: ScanContentProjectOptions = {},
): ContentProjectScan {
  const includeStatsFindings = options.includeStatsFindings ?? true
  const includeIntegrityFindings = options.includeIntegrityFindings ?? true
  const minSectionWords = options.minSectionWords ?? DEFAULT_MIN_SECTION_WORDS
  const scannedFiles: ContentProjectFileScan[] = []
  const findings: ContentProjectFinding[] = []
  const linkInputs: LinkInput[] = []

  for (const file of files) {
    const frontmatter = extractFrontmatter(file.source)?.data ?? {}
    linkInputs.push({ path: file.path, data: frontmatter })

    const validation = compileDocument(file.source, registry)
    const fileFindings = validation.diagnostics.map((diagnostic) =>
      findingFromDiagnostic('validation', file.path, diagnostic),
    )

    const stats = analyzeDocument(file.source, { path: file.path })
    if (includeStatsFindings) {
      fileFindings.push(...statsFindings(file.path, stats, minSectionWords))
    }

    findings.push(...fileFindings)
    scannedFiles.push({
      path: file.path,
      source: file.source,
      frontmatter,
      stats,
      validation,
      findings: fileFindings,
    })
  }

  let linkIndex: LinkIndex | undefined
  let linkGraph: ContentProjectLinkGraph | undefined
  let linkDiagnostics: LinkDiagnostic[] | undefined
  if (hasLinkFrontmatter(linkInputs, options.linkOptions?.slugField)) {
    linkDiagnostics = validateLinks(linkInputs, options.linkOptions)
    for (const { file, diagnostic } of linkDiagnostics) {
      const finding = findingFromDiagnostic('links', file, diagnostic)
      findings.push(finding)
      const scanned = scannedFiles.find((item) => item.path === file)
      if (scanned) scanned.findings.push(finding)
    }
    linkIndex = buildLinkIndex(linkInputs, options.linkOptions)
    linkGraph = createLinkGraphView(linkIndex, linkDiagnostics).summary
  }

  if (includeIntegrityFindings) {
    for (const integrity of scanContentIntegrity(scannedFiles)) {
      const finding: ContentProjectFinding = { source: 'integrity', ...integrity }
      findings.push(finding)
      const scanned = scannedFiles.find((item) => item.path === finding.file)
      if (scanned) scanned.findings.push(finding)
    }
  }

  const seo = options.seoConfig
    ? evaluateSeoProject({
        config: options.seoConfig,
        configPath: options.seoConfigPath,
        files: scannedFiles.map((file) => ({
          path: file.path,
          frontmatter: file.frontmatter,
          stats: file.stats,
        })),
        linkIndex,
        linkOptions: options.linkOptions,
      })
    : undefined
  if (seo) {
    findings.push(...seo.findings)
    for (const finding of seo.findings) {
      const scanned = scannedFiles.find((item) => item.path === finding.file)
      if (scanned) scanned.findings.push(finding)
    }
  }

  findings.sort(compareContentProjectFindings)
  for (const file of scannedFiles) file.findings.sort(compareContentProjectFindings)

  return {
    files: scannedFiles,
    findings,
    summary: summarizeContentProjectFindings(findings),
    linkInputs,
    ...(linkDiagnostics ? { linkDiagnostics } : {}),
    ...(linkIndex ? { linkIndex } : {}),
    ...(linkGraph ? { linkGraph } : {}),
    ...(seo ? { seo } : {}),
  }
}

export function summarizeContentProjectFindings(
  findings: ContentProjectFinding[],
): ContentProjectFindingSummary {
  return {
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    suggestions: findings.filter((finding) => finding.severity === 'info').length,
  }
}

export function compareContentProjectFindings(
  a: ContentProjectFinding,
  b: ContentProjectFinding,
): number {
  return (
    findingRank(a) - findingRank(b) ||
    a.file.localeCompare(b.file) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.column ?? 0) - (b.column ?? 0) ||
    a.code.localeCompare(b.code)
  )
}

function findingFromDiagnostic(
  source: Extract<ContentProjectFindingSource, 'validation' | 'links'>,
  file: string,
  diagnostic: Diagnostic,
): ContentProjectFinding {
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

function statsFindings(
  file: string,
  stats: DocumentStats,
  minSectionWords: number,
): ContentProjectFinding[] {
  const findings: ContentProjectFinding[] = []
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
  return findings
}

function hasLinkFrontmatter(inputs: LinkInput[], configuredSlugField: string | undefined): boolean {
  const slugField = configuredSlugField ?? 'slug'
  return inputs.some((input) => Object.prototype.hasOwnProperty.call(input.data, slugField))
}

function findingRank(finding: ContentProjectFinding): number {
  if (finding.severity === 'error' && finding.source === 'validation') return 0
  if (finding.severity === 'error' && finding.source === 'links') return 1
  if (finding.severity === 'error' && finding.source === 'seo') return 2
  if (finding.severity === 'warning') return 3
  if (finding.code === 'CB_THIN_SECTION') return 4
  if (finding.code === 'CB_BLOCKLESS_DOCUMENT') return 5
  if (finding.code === 'CB_IMAGE_ALT_MISSING') return 6
  return 7
}
