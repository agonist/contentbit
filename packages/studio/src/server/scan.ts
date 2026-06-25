import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  createSeoBrief,
  scanContentProject,
  type BlockDefinition,
  type BlockRegistry,
  type ContentProjectFinding,
  type ContentProjectScan,
  type DocumentStats,
  type SeoPage,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { basename, isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { glob } from 'tinyglobby'

import { renderStudioPreview } from './preview.js'
import type {
  StudioDocument,
  StudioFileSummary,
  StudioFinding,
  StudioGraph,
  StudioGraphEdge,
  StudioGraphNode,
  StudioKeywordData,
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
  const nodes: StudioGraphNode[] = [...context.index.pages.values()].map((page) => ({
    id: pageIdentity(page),
    label: page.title ?? page.slug,
    path: page.path,
    status: summaryByPath.get(page.path)?.status ?? 'healthy',
    slug: page.slug,
    ...(page.key ? { key: page.key } : {}),
    ...(page.locale ? { locale: page.locale } : {}),
  }))

  const pageByPath = new Map([...context.index.pages.values()].map((page) => [page.path, page]))
  const edges: StudioGraphEdge[] = []
  for (const page of context.index.pages.values()) {
    for (const ref of page.linkRefs) {
      const target = [...context.index.pages.values()].find(
        (candidate) =>
          candidate.slug === ref.slug &&
          candidate.key === ref.key &&
          candidate.locale === ref.locale,
      )
      edges.push({
        from: pageIdentity(page),
        to: target ? pageIdentity(target) : undefined,
        target: ref.target ?? ref.key ?? ref.slug,
        status:
          target === page
            ? 'self'
            : ref.locale && ref.locale !== page.locale
              ? 'cross-locale'
              : 'resolved',
      })
    }
  }

  for (const finding of context.findings) {
    if (finding.source !== 'links') continue
    if (finding.code !== 'CB_LINK_UNRESOLVED' && finding.code !== 'CB_LINK_LOCALE_MISSING') continue
    const page = pageByPath.get(finding.file)
    if (!page) continue
    edges.push({
      from: pageIdentity(page),
      target: targetFromMessage(finding.message) ?? 'unresolved',
      status: 'unresolved',
    })
  }

  return { nodes, edges }
}

async function scanContext(options: StudioOptions): Promise<ScanContext> {
  if (options.globs.length === 0) throw new Error('studio: provide at least one file or glob.')
  const cwd = options.cwd ?? process.cwd()
  const files = (await glob(options.globs, { absolute: true, cwd })).sort()
  if (files.length === 0) throw new Error(`studio: no files matched ${options.globs.join(' ')}`)

  const registry = await loadStudioRegistry(options.registryPath, cwd, options.includeGenericBlocks)
  const sourceFiles = await Promise.all(
    files.map(async (file) => ({ path: file, source: await readFile(file, 'utf8') })),
  )
  const scan = scanContentProject(sourceFiles, registry, {
    linkOptions: options.linkOptions,
    minSectionWords: options.minSectionWords,
    seoConfig: options.seoConfig,
    seoConfigPath: options.seoConfigPath,
  })
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

async function loadStudioRegistry(
  registryPath?: string,
  cwd = process.cwd(),
  includeGenericBlocks = true,
): Promise<BlockRegistry> {
  const registry = createBlockRegistry()
  if (includeGenericBlocks) registry.use(genericBlocks())
  if (!registryPath) return registry

  const resolvedPath = isAbsolute(registryPath) ? registryPath : join(cwd, registryPath)
  const mod = (await import(pathToFileURL(resolvedPath).href)) as {
    default?: BlockDefinition<unknown>[]
  }
  if (!Array.isArray(mod.default)) {
    throw new Error(
      `--registry module must default-export an array of block definitions: ${resolvedPath}`,
    )
  }
  registry.use(mod.default)
  return registry
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
  const keywords = keywordData(frontmatter.keywords)
  const slug = stringValue(frontmatter[options.linkOptions?.slugField ?? 'slug'])
  const key = stringValue(frontmatter[options.linkOptions?.keyField ?? 'key'])
  const locale = stringValue(frontmatter[options.linkOptions?.localeField ?? 'locale'])
  return {
    path: file,
    relativePath: relativePath(cwd, file),
    title: titleFor(file, frontmatter, stats),
    ...(slug ? { slug } : {}),
    ...(key ? { key } : {}),
    ...(locale ? { locale } : {}),
    ...(keywords ? { keywords } : {}),
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

function keywordData(value: unknown): StudioKeywordData | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const primary = stringValue(record.primary)
  const secondary = Array.isArray(record.secondary)
    ? record.secondary.filter((item): item is string => typeof item === 'string')
    : undefined
  return primary || (secondary?.length ?? 0) > 0
    ? { ...(primary ? { primary } : {}), ...(secondary ? { secondary } : {}) }
    : undefined
}

function summarize(findings: StudioFinding[]): StudioFileSummary['findings'] {
  return {
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    suggestions: findings.filter((finding) => finding.severity === 'info').length,
  }
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
    rank(a) - rank(b) ||
    a.relativePath.localeCompare(b.relativePath) ||
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.column ?? 0) - (b.column ?? 0) ||
    a.code.localeCompare(b.code)
  )
}

function rank(finding: StudioFinding): number {
  if (finding.severity === 'error' && finding.source === 'validation') return 0
  if (finding.severity === 'error' && finding.source === 'links') return 1
  if (finding.severity === 'warning') return 2
  if (finding.code === 'CB_THIN_SECTION') return 3
  if (finding.code === 'CB_BLOCKLESS_DOCUMENT') return 4
  if (finding.code === 'CB_IMAGE_ALT_MISSING') return 5
  return 6
}

function pageIdentity(page: { locale?: string; key?: string; slug: string }): string {
  return `${page.locale ?? ''}\0${page.key ?? page.slug}`
}

function targetFromMessage(message: string): string | undefined {
  return message.match(/linksTo "([^"]+)"/)?.[1]
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function relativePath(cwd: string, file: string): string {
  const rel = relative(cwd, file)
  return rel.startsWith('..') ? file : rel
}
