import { z } from 'zod'

import type { Diagnostic } from './diagnostics.js'
import type { DocumentStats } from './analyze.js'
import type { LinkIndex } from './links.js'

export const SEO_BRIEF_SCHEMA_VERSION = 'contentbit.seo.brief.v1'
export const SEO_RESULT_SCHEMA_VERSION = 'contentbit.seo.v1'

const KeywordsSchema = z.object({
  primary: z.string().min(1).optional(),
  secondary: z.array(z.string().min(1)).optional(),
})

const RequiredSectionSchema = z.union([
  z.string().min(1),
  z.object({
    id: z.string().min(1),
    headings: z.array(z.string().min(1)).min(1),
  }),
])

const SeoPageTypeSchema = z.object({
  requiredFrontmatter: z.array(z.string().min(1)).optional(),
  requiredSections: z.array(RequiredSectionSchema).optional(),
  requiredBlocks: z.array(z.string().min(1)).optional(),
  recommendedBlocks: z.array(z.string().min(1)).optional(),
  requiredLinksTo: z.array(z.string().min(1)).optional(),
  minOutgoingLinks: z.number().int().nonnegative().optional(),
  minIncomingLinks: z.number().int().nonnegative().optional(),
})

const SeoConfigPageSchema = z.object({
  type: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  intent: z.string().min(1).optional(),
  keywords: KeywordsSchema.optional(),
  linksTo: z.array(z.string().min(1)).optional(),
})

const SeoConfigSchema = z.object({
  pageTypes: z.record(z.string().min(1), SeoPageTypeSchema).default({}),
  pages: z.record(z.string().min(1), SeoConfigPageSchema).default({}),
})

export type SeoRequiredSectionInput = z.input<typeof RequiredSectionSchema>
export type SeoConfigInput = z.input<typeof SeoConfigSchema>
export type SeoPageTypeContract = z.infer<typeof SeoPageTypeSchema>
export type SeoConfigPage = z.infer<typeof SeoConfigPageSchema>
export type SeoConfig = z.infer<typeof SeoConfigSchema>

export interface NormalizedSeoSection {
  id: string
  headings: string[]
}

export interface SeoProjectFile {
  path: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
}

export interface SeoConfigDiagnostic {
  code: 'CB_SEO_CONFIG_INVALID'
  severity: Extract<Diagnostic['severity'], 'error'>
  source: 'seo'
  file: string
  message: string
}

export type SeoFindingCode =
  | 'CB_SEO_CONFIG_INVALID'
  | 'CB_SEO_TYPE_MISSING'
  | 'CB_SEO_TYPE_UNKNOWN'
  | 'CB_SEO_FRONTMATTER_MISSING'
  | 'CB_SEO_SECTION_MISSING'
  | 'CB_SEO_BLOCK_REQUIRED'
  | 'CB_SEO_BLOCK_RECOMMENDED'
  | 'CB_SEO_LINK_REQUIRED'
  | 'CB_SEO_OUTGOING_LINKS_MIN'
  | 'CB_SEO_INCOMING_LINKS_MIN'

export interface SeoFinding {
  severity: Diagnostic['severity']
  source: 'seo'
  code: SeoFindingCode
  file: string
  line?: number
  column?: number
  message: string
  hint?: string
  pageId?: string
}

export interface SeoPage {
  id: string
  source: 'existing' | 'planned'
  path?: string
  key?: string
  slug?: string
  title?: string
  type?: string
  intent?: string
  keywords?: { primary?: string; secondary?: string[] }
  linksTo: string[]
  linkedFrom: string[]
  frontmatter: Record<string, unknown>
  stats?: DocumentStats
}

export interface SeoProjectEvaluation {
  schemaVersion: typeof SEO_RESULT_SCHEMA_VERSION
  pages: SeoPage[]
  findings: SeoFinding[]
  config: SeoConfig
}

export interface SeoBrief {
  schemaVersion: typeof SEO_BRIEF_SCHEMA_VERSION
  target: SeoPage
  contract?: SeoPageTypeContract
  requiredSections: NormalizedSeoSection[]
  requiredBlocks: string[]
  recommendedBlocks: string[]
  requiredLinksTo: string[]
  findings: SeoFinding[]
  relatedPages: SeoPage[]
  acceptanceChecks: string[]
}

export interface EvaluateSeoProjectInput {
  config: unknown
  files: SeoProjectFile[]
  linkIndex?: LinkIndex
  configPath?: string
}

export type ParseSeoConfigResult =
  | { ok: true; config: SeoConfig }
  | { ok: false; findings: SeoConfigDiagnostic[] }

export function defineSeoConfig<T extends SeoConfigInput>(config: T): T {
  return config
}

export function parseSeoConfig(
  value: unknown,
  configPath = 'contentbit.seo.config.ts',
): ParseSeoConfigResult {
  const parsed = SeoConfigSchema.safeParse(value)
  if (parsed.success) return { ok: true, config: parsed.data }
  return {
    ok: false,
    findings: parsed.error.issues.map((issue) => ({
      severity: 'error',
      source: 'seo',
      code: 'CB_SEO_CONFIG_INVALID',
      file: configPath,
      message: `${issue.path.join('.') || 'config'}: ${issue.message}`,
    })),
  }
}

export function evaluateSeoProject(input: EvaluateSeoProjectInput): SeoProjectEvaluation {
  const parsed = parseSeoConfig(input.config, input.configPath)
  if (!parsed.ok) {
    return {
      schemaVersion: SEO_RESULT_SCHEMA_VERSION,
      pages: [],
      findings: parsed.findings,
      config: { pageTypes: {}, pages: {} },
    }
  }

  const pages = normalizeSeoPages(parsed.config, input.files, input.linkIndex)
  const findings: SeoFinding[] = []
  for (const page of pages) {
    if (page.source === 'planned') continue
    findings.push(...evaluatePage(page, parsed.config))
  }

  return {
    schemaVersion: SEO_RESULT_SCHEMA_VERSION,
    pages,
    findings: findings.sort(compareSeoFindings),
    config: parsed.config,
  }
}

export function createSeoBrief(
  evaluation: SeoProjectEvaluation,
  targetKeyOrSlug: string,
): SeoBrief {
  const target = findSeoPage(evaluation.pages, targetKeyOrSlug)
  if (!target) throw new Error(`SEO brief target not found: ${targetKeyOrSlug}`)
  const contract = target.type ? evaluation.config.pageTypes[target.type] : undefined
  const requiredSections = normalizeRequiredSections(contract?.requiredSections ?? [])
  const requiredBlocks = contract?.requiredBlocks ?? []
  const recommendedBlocks = contract?.recommendedBlocks ?? []
  const requiredLinksTo = [...(contract?.requiredLinksTo ?? []), ...plannedLinks(target)]
  const findings = evaluation.findings.filter((finding) => finding.pageId === target.id)
  const relatedPages = evaluation.pages
    .filter((page) => page.id !== target.id)
    .filter((page) => page.type === target.type || sharesLinks(page, target))
    .slice(0, 10)

  return {
    schemaVersion: SEO_BRIEF_SCHEMA_VERSION,
    target: publicSeoPage(target),
    ...(contract ? { contract } : {}),
    requiredSections,
    requiredBlocks,
    recommendedBlocks,
    requiredLinksTo: unique(requiredLinksTo),
    findings,
    relatedPages: relatedPages.map(publicSeoPage),
    acceptanceChecks: acceptanceChecks(target, contract),
  }
}

function publicSeoPage(page: SeoPage): SeoPage {
  const { stats: _stats, ...publicPage } = page
  return publicPage
}

export function formatSeoBriefMarkdown(brief: SeoBrief): string {
  const lines: string[] = []
  lines.push(
    `# SEO Brief: ${brief.target.title ?? brief.target.key ?? brief.target.slug ?? brief.target.id}`,
  )
  lines.push('')
  lines.push(`- Page ID: ${brief.target.id}`)
  if (brief.target.source) lines.push(`- Status: ${brief.target.source}`)
  if (brief.target.type) lines.push(`- Page type: ${brief.target.type}`)
  if (brief.target.intent) lines.push(`- Intent: ${brief.target.intent}`)
  if (brief.target.key) lines.push(`- Key: ${brief.target.key}`)
  if (brief.target.slug) lines.push(`- Slug: ${brief.target.slug}`)
  if (brief.target.keywords?.primary)
    lines.push(`- Primary keyword: ${brief.target.keywords.primary}`)
  if ((brief.target.keywords?.secondary?.length ?? 0) > 0) {
    lines.push(`- Secondary keywords: ${brief.target.keywords!.secondary!.join(', ')}`)
  }

  addList(
    lines,
    'Required Sections',
    brief.requiredSections.map((section) => section.headings.join(' / ')),
  )
  addList(lines, 'Required Blocks', brief.requiredBlocks)
  addList(lines, 'Recommended Blocks', brief.recommendedBlocks)
  addList(lines, 'Required Links', brief.requiredLinksTo)
  addList(
    lines,
    'Current Findings',
    brief.findings.map((finding) => `${finding.code}: ${finding.message}`),
  )
  addList(
    lines,
    'Related Pages',
    brief.relatedPages.map(
      (page) => `${page.title ?? page.key ?? page.slug ?? page.id} (${page.id})`,
    ),
  )
  addList(lines, 'Acceptance Checks', brief.acceptanceChecks)

  return `${lines.join('\n')}\n`
}

function normalizeSeoPages(
  config: SeoConfig,
  files: SeoProjectFile[],
  linkIndex: LinkIndex | undefined,
): SeoPage[] {
  const byId = new Map<string, SeoPage>()
  const byConfigId = new Map<string, SeoPage>()
  for (const [id, page] of Object.entries(config.pages)) {
    const key = page.key ?? id
    const slug = page.slug
    const normalized: SeoPage = {
      id: key,
      source: 'planned',
      ...(key ? { key } : {}),
      ...(slug ? { slug } : {}),
      ...(page.title ? { title: page.title } : {}),
      ...(page.type ? { type: page.type } : {}),
      ...(page.intent ? { intent: page.intent } : {}),
      ...(page.keywords ? { keywords: page.keywords } : {}),
      linksTo: page.linksTo ?? [],
      linkedFrom: [],
      frontmatter: pageToFrontmatter(page),
    }
    byId.set(normalized.id, normalized)
    byConfigId.set(id, normalized)
  }

  const linkPageByPath = new Map(
    linkIndex ? [...linkIndex.pages.values()].map((page) => [page.path, page]) : [],
  )
  for (const file of files) {
    const fm = file.frontmatter
    const key = stringValue(fm.key)
    const slug = stringValue(fm.slug)
    const id = key ?? slug ?? file.path
    const planned =
      byId.get(id) ??
      (slug ? byId.get(slug) : undefined) ??
      findPlannedByPath(byConfigId, file.path)
    const linkPage = linkPageByPath.get(file.path)
    const page: SeoPage = {
      ...(planned ?? {
        id,
        source: 'existing' as const,
        linksTo: [],
        linkedFrom: [],
        frontmatter: {},
      }),
      id: planned?.id ?? id,
      source: 'existing',
      path: file.path,
      key: key ?? planned?.key,
      slug: slug ?? planned?.slug,
      title: stringValue(fm.title) ?? planned?.title ?? file.stats.outline[0]?.text,
      type: stringValue(fm.type) ?? stringValue(fm.pageType) ?? planned?.type,
      intent: stringValue(fm.intent) ?? planned?.intent,
      keywords: keywordsValue(fm.keywords) ?? planned?.keywords,
      linksTo: linkPage?.linksTo ?? stringArray(fm.linksTo) ?? planned?.linksTo ?? [],
      linkedFrom: linkPage?.linkedFrom ?? planned?.linkedFrom ?? [],
      frontmatter: { ...planned?.frontmatter, ...fm },
      stats: file.stats,
    }
    byId.set(page.id, page)
    if (page.slug && page.slug !== page.id) byId.delete(page.slug)
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function evaluatePage(page: SeoPage, config: SeoConfig): SeoFinding[] {
  const findings: SeoFinding[] = []
  if (!page.type) {
    findings.push(
      finding(page, 'warning', 'CB_SEO_TYPE_MISSING', 'page is missing an SEO page type'),
    )
    return findings
  }
  const contract = config.pageTypes[page.type]
  if (!contract) {
    findings.push(
      finding(
        page,
        'warning',
        'CB_SEO_TYPE_UNKNOWN',
        `page type "${page.type}" is not defined in SEO config`,
      ),
    )
    return findings
  }

  for (const field of contract.requiredFrontmatter ?? []) {
    if (getPath(page.frontmatter, field) === undefined) {
      findings.push(
        finding(
          page,
          'warning',
          'CB_SEO_FRONTMATTER_MISSING',
          `required frontmatter "${field}" is missing`,
        ),
      )
    }
  }

  const headingTexts = new Set(pageOutlineHeadings(page))
  for (const section of normalizeRequiredSections(contract.requiredSections ?? [])) {
    if (!section.headings.some((heading) => headingTexts.has(normalizeText(heading)))) {
      findings.push(
        finding(
          page,
          'warning',
          'CB_SEO_SECTION_MISSING',
          `required section "${section.headings[0]}" is missing`,
        ),
      )
    }
  }

  for (const block of contract.requiredBlocks ?? []) {
    if (!pageHasBlock(page, block)) {
      findings.push(
        finding(page, 'warning', 'CB_SEO_BLOCK_REQUIRED', `required block "${block}" is missing`),
      )
    }
  }
  for (const block of contract.recommendedBlocks ?? []) {
    if (!pageHasBlock(page, block)) {
      findings.push(
        finding(
          page,
          'info',
          'CB_SEO_BLOCK_RECOMMENDED',
          `recommended block "${block}" is missing`,
        ),
      )
    }
  }

  for (const target of contract.requiredLinksTo ?? []) {
    if (!page.linksTo.includes(target)) {
      findings.push(
        finding(
          page,
          'warning',
          'CB_SEO_LINK_REQUIRED',
          `required link target "${target}" is missing`,
        ),
      )
    }
  }
  if (contract.minOutgoingLinks !== undefined && page.linksTo.length < contract.minOutgoingLinks) {
    findings.push(
      finding(
        page,
        'warning',
        'CB_SEO_OUTGOING_LINKS_MIN',
        `page has ${page.linksTo.length} outgoing SEO link(s), expected at least ${contract.minOutgoingLinks}`,
      ),
    )
  }
  if (
    contract.minIncomingLinks !== undefined &&
    page.linkedFrom.length < contract.minIncomingLinks
  ) {
    findings.push(
      finding(
        page,
        'warning',
        'CB_SEO_INCOMING_LINKS_MIN',
        `page has ${page.linkedFrom.length} incoming SEO link(s), expected at least ${contract.minIncomingLinks}`,
      ),
    )
  }

  return findings
}

function finding(
  page: SeoPage,
  severity: Diagnostic['severity'],
  code: SeoFindingCode,
  message: string,
): SeoFinding {
  return {
    severity,
    source: 'seo',
    code,
    file: page.path ?? page.id,
    message,
    pageId: page.id,
  }
}

function normalizeRequiredSections(sections: SeoRequiredSectionInput[]): NormalizedSeoSection[] {
  return sections.map((section) =>
    typeof section === 'string'
      ? { id: normalizeText(section), headings: [section] }
      : { id: section.id, headings: section.headings },
  )
}

function pageOutlineHeadings(page: SeoPage): string[] {
  return page.stats?.outline.map((entry) => normalizeText(entry.text)) ?? []
}

function pageHasBlock(page: SeoPage, block: string): boolean {
  return (page.stats?.blocks.byName[block] ?? 0) > 0
}

function pageToFrontmatter(page: SeoConfigPage): Record<string, unknown> {
  return {
    ...(page.type ? { type: page.type } : {}),
    ...(page.key ? { key: page.key } : {}),
    ...(page.slug ? { slug: page.slug } : {}),
    ...(page.title ? { title: page.title } : {}),
    ...(page.intent ? { intent: page.intent } : {}),
    ...(page.keywords ? { keywords: page.keywords } : {}),
    ...(page.linksTo ? { linksTo: page.linksTo } : {}),
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined
}

function keywordsValue(value: unknown): SeoPage['keywords'] | undefined {
  const parsed = KeywordsSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

function getPath(record: Record<string, unknown>, path: string): unknown {
  let current: unknown = record
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function compareSeoFindings(a: SeoFinding, b: SeoFinding): number {
  return (
    severityRank(a.severity) - severityRank(b.severity) ||
    a.file.localeCompare(b.file) ||
    a.code.localeCompare(b.code)
  )
}

function severityRank(severity: Diagnostic['severity']): number {
  if (severity === 'error') return 0
  if (severity === 'warning') return 1
  return 2
}

function findSeoPage(pages: SeoPage[], target: string): SeoPage | undefined {
  return pages.find((page) => page.key === target || page.slug === target || page.id === target)
}

function findPlannedByPath(byId: Map<string, SeoPage>, filePath: string): SeoPage | undefined {
  const normalizedFilePath = normalizePath(filePath)
  for (const [id, page] of byId) {
    if (pathMatches(normalizePath(id), normalizedFilePath)) return page
  }
  return undefined
}

function pathMatches(configId: string, filePath: string): boolean {
  return filePath === configId || filePath.endsWith(`/${configId}`)
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\.\/+/, '')
}

function plannedLinks(page: SeoPage): string[] {
  return stringArray(page.frontmatter.linksTo) ?? []
}

function sharesLinks(a: SeoPage, b: SeoPage): boolean {
  return (
    a.linksTo.some((link) => b.linksTo.includes(link)) ||
    a.linkedFrom.some((link) => b.linkedFrom.includes(link))
  )
}

function acceptanceChecks(target: SeoPage, contract: SeoPageTypeContract | undefined): string[] {
  const checks: string[] = []
  if (!contract) {
    checks.push('Define a valid SEO page type before writing.')
    return checks
  }
  for (const field of contract.requiredFrontmatter ?? [])
    checks.push(`Frontmatter includes ${field}.`)
  for (const section of normalizeRequiredSections(contract.requiredSections ?? [])) {
    checks.push(`Document includes section: ${section.headings[0]}.`)
  }
  for (const block of contract.requiredBlocks ?? [])
    checks.push(`Document uses required block: ${block}.`)
  for (const targetLink of contract.requiredLinksTo ?? [])
    checks.push(`Frontmatter linksTo includes ${targetLink}.`)
  if (contract.minOutgoingLinks !== undefined) {
    checks.push(`Document has at least ${contract.minOutgoingLinks} outgoing SEO links.`)
  }
  if (contract.minIncomingLinks !== undefined) {
    checks.push(`Document has at least ${contract.minIncomingLinks} incoming SEO links.`)
  }
  if (target.source === 'planned')
    checks.push('Create the Markdown source file for this planned page.')
  return checks
}

function addList(lines: string[], title: string, items: string[]): void {
  if (items.length === 0) return
  lines.push('')
  lines.push(`## ${title}`)
  for (const item of items) lines.push(`- ${item}`)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}
