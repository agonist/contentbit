import { genericBlocks } from '@contentbit/blocks'
import {
  analyzeDocument,
  buildLinkIndex,
  createBlockRegistry,
  extractFrontmatter,
  parseDocument,
  stripFrontmatter,
  validateDocument,
  validateLinks,
  type BlockDefinition,
  type BlockRegistry,
  type Diagnostic,
  type LinkInput,
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

const DEFAULT_MIN_SECTION_WORDS = 25
const BLOCKLESS_WORDS = 250

interface ScanContext {
  files: string[]
  registry: BlockRegistry
  sources: Map<string, string>
  frontmatter: Map<string, Record<string, unknown>>
  findings: StudioFinding[]
  summaries: StudioFileSummary[]
  linkInputs: LinkInput[]
  index?: ReturnType<typeof buildLinkIndex>
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
    ...(context.index ? { linkGraph: graphSummary(context.index) } : {}),
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
  const source = context.sources.get(file)!
  const summary = context.summaries.find((item) => item.path === file)
  if (!summary) return null

  const validation = validateDocument(parseDocument(stripFrontmatter(source)), context.registry)
  const previewHtml = renderStudioPreview(
    validation.document,
    (await options.previewComponents?.()) ?? {},
    { includeGenericComponents: options.includeGenericBlocks !== false },
  )
  const stats = analyzeDocument(source, { path: file })
  const page = context.index
    ? [...context.index.pages.values()].find((entry) => entry.path === file)
    : undefined

  return {
    file: summary,
    source,
    frontmatter: context.frontmatter.get(file) ?? {},
    stats,
    findings: context.findings.filter((finding) => finding.file === file),
    linksTo: page ? (page.linkRefs.length > 0 ? page.linkRefs : page.linksTo) : [],
    linkedFrom: page
      ? page.linkedFromRefs.length > 0
        ? page.linkedFromRefs
        : page.linkedFrom
      : [],
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
  const sources = new Map<string, string>()
  const frontmatter = new Map<string, Record<string, unknown>>()
  const findings: StudioFinding[] = []
  const summaries: StudioFileSummary[] = []
  const linkInputs: LinkInput[] = []

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const fm = extractFrontmatter(source)?.data ?? {}
    sources.set(file, source)
    frontmatter.set(file, fm)
    linkInputs.push({ path: file, data: fm })

    const validation = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    for (const diagnostic of validation.diagnostics) {
      findings.push(findingFromDiagnostic('validation', file, cwd, diagnostic))
    }

    const stats = analyzeDocument(source, { path: file })
    findings.push(
      ...statsFindings(file, cwd, stats, options.minSectionWords ?? DEFAULT_MIN_SECTION_WORDS),
    )
    summaries.push(
      fileSummary(
        file,
        cwd,
        fm,
        stats,
        findings.filter((finding) => finding.file === file),
        options,
      ),
    )
  }

  let index: ScanContext['index']
  if (hasLinkFrontmatter(linkInputs, options.linkOptions?.slugField)) {
    for (const { file, diagnostic } of validateLinks(linkInputs, options.linkOptions)) {
      findings.push(findingFromDiagnostic('links', file, cwd, diagnostic))
    }
    index = buildLinkIndex(linkInputs, options.linkOptions)
    refreshSummaryFindings(summaries, findings)
  }

  findings.sort(compareFindings)
  return { files, registry, sources, frontmatter, findings, summaries, linkInputs, index }
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

function statsFindings(
  file: string,
  cwd: string,
  stats: ReturnType<typeof analyzeDocument>,
  minSectionWords: number,
): StudioFinding[] {
  const findings: StudioFinding[] = []
  for (const section of stats.outline) {
    if (section.words < minSectionWords) {
      findings.push({
        severity: 'info',
        source: 'stats',
        code: 'CB_THIN_SECTION',
        file,
        relativePath: relativePath(cwd, file),
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
      relativePath: relativePath(cwd, file),
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
      relativePath: relativePath(cwd, file),
      message: `${stats.images.missingAlt} image(s) are missing alt text`,
      hint: 'Add descriptive alt text for meaningful images; use empty alt only for decorative images.',
    })
  }
  return findings
}

function findingFromDiagnostic(
  source: 'validation' | 'links',
  file: string,
  cwd: string,
  diagnostic: Diagnostic,
): StudioFinding {
  return {
    severity: diagnostic.severity,
    source,
    code: diagnostic.code,
    file,
    relativePath: relativePath(cwd, file),
    line: diagnostic.position.start.line,
    column: diagnostic.position.start.column,
    message: diagnostic.message,
    ...(diagnostic.hint ? { hint: diagnostic.hint } : {}),
  }
}

function fileSummary(
  file: string,
  cwd: string,
  frontmatter: Record<string, unknown>,
  stats: ReturnType<typeof analyzeDocument>,
  findings: StudioFinding[],
  options: StudioOptions,
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
    findings: counts,
    status: statusFor(counts),
  }
}

function refreshSummaryFindings(summaries: StudioFileSummary[], findings: StudioFinding[]): void {
  for (const summary of summaries) {
    summary.findings = summarize(findings.filter((finding) => finding.file === summary.path))
    summary.status = statusFor(summary.findings)
  }
}

function titleFor(
  file: string,
  frontmatter: Record<string, unknown>,
  stats: ReturnType<typeof analyzeDocument>,
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

function graphSummary(index: NonNullable<ScanContext['index']>): StudioProject['linkGraph'] {
  let links = 0
  for (const page of index.pages.values()) links += page.linksTo.length
  return {
    pages: index.pages.size,
    links,
    orphans: [...index.pages.values()].filter((page) => page.linkedFrom.length === 0).length,
  }
}

function hasLinkFrontmatter(inputs: LinkInput[], configuredSlugField: string | undefined): boolean {
  const slugField = configuredSlugField ?? 'slug'
  return inputs.some((input) => Object.prototype.hasOwnProperty.call(input.data, slugField))
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
