import {
  compareContentProjectFindings,
  createLinkGraphView,
  createSeoBrief,
  readContentPageFacts,
  summarizeContentProjectFindings,
  type ContentProjectFinding,
  type ContentProjectScan,
  type DocumentStats,
  type SeoPage,
} from '@contentbit/core'
import { loadContentProject } from '@contentbit/project'
import { basename, relative } from 'node:path'

import { renderStudioPreview } from './preview.js'
import type {
  StudioDocument,
  StudioFileSummary,
  StudioFinding,
  StudioGraph,
  StudioGraphEdge,
  StudioGraphNode,
  StudioOptions,
  StudioProject,
  StudioStatus,
} from './types.js'

interface ScanContext {
  files: string[]
  scan: ContentProjectScan
  findings: StudioFinding[]
  summaries: StudioFileSummary[]
  index?: ContentProjectScan['linkIndex']
}

export async function scanProject(options: StudioOptions): Promise<StudioProject> {
  const context = await scanContext(options)
  const blockUsage: Record<string, number> = {}
  let words = 0
  let blocks = 0
  let links = 0
  let missingAlt = 0
  let withPrimary = 0
  let withSecondary = 0

  for (const file of context.summaries) {
    words += file.words
    blocks += file.blocks
    links += file.links
    missingAlt += file.missingAlt
    if (file.keywords?.primary) withPrimary++
    if ((file.keywords?.secondary?.length ?? 0) > 0) withSecondary++
    for (const [name, count] of Object.entries(file.blockNames)) {
      blockUsage[name] = (blockUsage[name] ?? 0) + count
    }
  }

  const summary = summarize(context.findings)
  return {
    root: options.cwd ?? process.cwd(),
    files: context.summaries,
    summary: {
      files: context.summaries.length,
      errors: summary.errors,
      warnings: summary.warnings,
      suggestions: summary.suggestions,
      words,
      blocks,
      links,
      missingAlt,
    },
    blockUsage,
    keywordCoverage: {
      total: context.summaries.length,
      withPrimary,
      withSecondary,
    },
    ...(context.scan.linkGraph ? { linkGraph: context.scan.linkGraph } : {}),
    ...(context.scan.seo
      ? {
          seo: {
            schemaVersion: context.scan.seo.schemaVersion,
            pages: context.scan.seo.pages.length,
            existing: context.scan.seo.pages.filter((page) => page.source === 'existing').length,
            planned: context.scan.seo.pages.filter((page) => page.source === 'planned').length,
            findings: context.scan.seo.findings.length,
          },
        }
      : {}),
    findings: context.findings,
  }
}

export async function scanDocument(
  options: StudioOptions,
  requestedPath: string,
): Promise<StudioDocument | null> {
  const context = await scanContext(options)
  const file = findAllowedFile(context, options.cwd ?? process.cwd(), requestedPath)
  if (!file) return null
  const scanned = context.scan.files.find((item) => item.path === file)
  if (!scanned) return null
  const summary = context.summaries.find((item) => item.path === file)
  if (!summary) return null

  const previewHtml = renderStudioPreview(
    scanned.validation.document,
    (await options.previewComponents?.()) ?? {},
    { includeGenericComponents: options.includeGenericBlocks !== false },
  )
  const page = context.index
    ? [...context.index.pages.values()].find((entry) => entry.path === file)
    : undefined
  const seoPage = context.scan.seo?.pages.find((entry) => entry.path === file)
  const seoBrief =
    context.scan.seo && seoPage ? createSeoBrief(context.scan.seo, seoPage.id) : undefined

  return {
    file: summary,
    source: scanned.source,
    frontmatter: scanned.frontmatter,
    stats: scanned.stats,
    findings: context.findings.filter((finding) => finding.file === file),
    linksTo: page ? (page.linkRefs.length > 0 ? page.linkRefs : page.linksTo) : [],
    linkedFrom: page
      ? page.linkedFromRefs.length > 0
        ? page.linkedFromRefs
        : page.linkedFrom
      : [],
    ...(seoBrief ? { seoBrief } : {}),
    previewHtml,
  }
}

export async function scanGraph(options: StudioOptions): Promise<StudioGraph> {
  const context = await scanContext(options)
  if (!context.index) return { nodes: [], edges: [] }

  const summaryByPath = new Map(context.summaries.map((summary) => [summary.path, summary]))
  const view = createLinkGraphView(context.index, context.scan.linkDiagnostics ?? [])
  const nodes: StudioGraphNode[] = view.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    path: node.path,
    status: summaryByPath.get(node.path)?.status ?? 'healthy',
    slug: node.slug,
    ...(node.key ? { key: node.key } : {}),
    ...(node.locale ? { locale: node.locale } : {}),
  }))
  const edges: StudioGraphEdge[] = view.edges
  return { nodes, edges }
}

async function scanContext(options: StudioOptions): Promise<ScanContext> {
  const cwd = options.cwd ?? process.cwd()
  const project = await loadContentProject({
    cmd: 'studio',
    positionals: options.globs,
    cwd,
    registry: options.registryPath,
    includeGenericBlocks: options.includeGenericBlocks,
    linkOptions: options.linkOptions,
    scan: {
      minSectionWords: options.minSectionWords,
      seoConfig: options.seoConfig,
      seoConfigPath: options.seoConfigPath,
    },
  })
  const { files, scan } = project
  const findings = scan.findings
    .map((finding) => findingFromProjectFinding(finding, cwd))
    .sort(compareFindings)
  const summaries = scan.files.map((file) =>
    fileSummary(
      file.path,
      cwd,
      file.frontmatter,
      file.stats,
      findings.filter((finding) => finding.file === file.path),
      options,
      scan.seo?.pages.find((page) => page.path === file.path),
    ),
  )

  const index = scan.linkIndex
  findings.sort(compareFindings)
  return { files, scan, findings, summaries, index }
}

function findingFromProjectFinding(finding: ContentProjectFinding, cwd: string): StudioFinding {
  return {
    severity: finding.severity,
    source: finding.source,
    code: finding.code,
    file: finding.file,
    relativePath: relativePath(cwd, finding.file),
    ...(finding.line !== undefined ? { line: finding.line } : {}),
    ...(finding.column !== undefined ? { column: finding.column } : {}),
    message: finding.message,
    ...(finding.hint ? { hint: finding.hint } : {}),
  }
}

function fileSummary(
  file: string,
  cwd: string,
  frontmatter: Record<string, unknown>,
  stats: DocumentStats,
  findings: StudioFinding[],
  options: StudioOptions,
  seoPage?: SeoPage,
): StudioFileSummary {
  const counts = summarize(findings)
  const facts = readContentPageFacts(frontmatter, options.linkOptions)
  return {
    path: file,
    relativePath: relativePath(cwd, file),
    title: titleFor(file, frontmatter, stats),
    ...(facts.slug ? { slug: facts.slug } : {}),
    ...(facts.key ? { key: facts.key } : {}),
    ...(facts.locale ? { locale: facts.locale } : {}),
    ...(facts.keywords ? { keywords: facts.keywords } : {}),
    words: stats.length.words,
    readingMinutes: stats.length.readingMinutes,
    blocks: stats.blocks.total,
    blockNames: stats.blocks.byName,
    links: stats.links.total,
    externalLinks: stats.links.external,
    missingAlt: stats.images.missingAlt,
    ...(seoPage
      ? {
          seo: {
            id: seoPage.id,
            source: seoPage.source,
            ...(seoPage.type ? { type: seoPage.type } : {}),
            ...(seoPage.intent ? { intent: seoPage.intent } : {}),
            findings: findings.filter((finding) => finding.source === 'seo').length,
          },
        }
      : {}),
    findings: counts,
    status: statusFor(counts),
  }
}

function titleFor(
  file: string,
  frontmatter: Record<string, unknown>,
  stats: DocumentStats,
): string {
  return stringValue(frontmatter.title) ?? stats.outline[0]?.text ?? basename(file)
}

function summarize(findings: StudioFinding[]): StudioFileSummary['findings'] {
  return summarizeContentProjectFindings(findings)
}

function statusFor(findings: StudioFileSummary['findings']): StudioStatus {
  if (findings.errors > 0) return 'error'
  if (findings.warnings > 0) return 'warning'
  if (findings.suggestions > 0) return 'suggestion'
  return 'healthy'
}

function findAllowedFile(context: ScanContext, cwd: string, requestedPath: string): string | null {
  return (
    context.files.find(
      (file) => file === requestedPath || relativePath(cwd, file) === requestedPath,
    ) ?? null
  )
}

function compareFindings(a: StudioFinding, b: StudioFinding): number {
  return (
    compareContentProjectFindings(a, b) ||
    a.relativePath.localeCompare(b.relativePath) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.column ?? 0) - (b.column ?? 0) ||
    a.code.localeCompare(b.code)
  )
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function relativePath(cwd: string, file: string): string {
  const rel = relative(cwd, file)
  return rel.startsWith('..') ? file : rel
}
