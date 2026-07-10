import {
  scanContentProject,
  type ContentProjectFileScan,
  type ContentProjectFinding,
  type LinkResolveMode,
} from '@contentbit/core'

import type { Io } from '../run.js'

import { color, formatRows, section } from '../cli-format.js'
import { loadContentProject } from '../content-project.js'

const DEFAULT_ADOPT_GLOBS = ['content/**/*.{md,mdx}']
const ADOPTION_SCHEMA_VERSION = 'contentbit.adoption.v1'

export interface AdoptCommandInput {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  dryRun?: boolean
  json?: boolean
}

interface ContractProposal {
  type: string
  files: number
  requiredFrontmatter: string[]
  requiredSections: string[]
}

interface AdoptionReport {
  schemaVersion: typeof ADOPTION_SCHEMA_VERSION
  dryRun: true
  files: number
  frontmatter: Record<'slug' | 'key' | 'locale' | 'title' | 'description' | 'linksTo', number>
  inferred: {
    content: string[]
    links: { resolve: LinkResolveMode }
    pageTypes: string[]
    contracts: ContractProposal[]
  }
  localeCoverage: Array<{ key: string; locales: string[] }>
  findings: ContentProjectFinding[]
  proposals: {
    contentbitConfig: string
    frontmatter: Array<{ path: string; add: Record<string, string> }>
    seoConfig?: string
  }
}

/** Inspect an existing Markdown library and print reviewable setup proposals.
 * This command intentionally has no write path: adoption starts with an audit,
 * so a project owner chooses what becomes configuration or source edits. */
export async function adoptCommand(input: AdoptCommandInput, io: Io): Promise<number> {
  const globs = input.globs.length > 0 ? input.globs : DEFAULT_ADOPT_GLOBS
  const project = await loadContentProject({
    cmd: 'adopt',
    positionals: globs,
    registry: input.registry,
    includeGenericBlocks: !input.noGenericBlocks,
  })
  const frontmatters = project.scan.files.map((file) => file.frontmatter)
  const linkResolve = inferLinkResolution(frontmatters)
  // Re-run the shared scan with the strategy we just inferred. This avoids
  // treating legitimate localized slugs as duplicates in the adoption report.
  const scan = scanContentProject(project.sources, project.registry, {
    linkOptions: { resolve: linkResolve },
  })
  const report = createAdoptionReport(globs, project.files.length, scan.findings, scan.files)

  if (input.json) io.stdout(JSON.stringify(report, null, 2))
  else io.stdout(formatAdoptionReport(report))
  return 0
}

function createAdoptionReport(
  globs: string[],
  files: number,
  findings: ContentProjectFinding[],
  scannedFiles: ContentProjectFileScan[],
): AdoptionReport {
  const frontmatters = scannedFiles.map((file) => file.frontmatter)
  const frontmatter = countFrontmatter(frontmatters)
  const links = inferLinkResolution(frontmatters)
  const pageTypes = valuesForField(frontmatters, 'type')
  const contracts = inferContracts(scannedFiles, pageTypes)
  const localeCoverage = coverageByKey(frontmatters)
  const contentbitConfig = contentbitConfigProposal(globs, links)
  const seoConfig = contracts.length > 0 ? seoConfigProposal(contracts) : undefined
  return {
    schemaVersion: ADOPTION_SCHEMA_VERSION,
    dryRun: true,
    files,
    frontmatter,
    inferred: { content: globs, links: { resolve: links }, pageTypes, contracts },
    localeCoverage,
    findings,
    proposals: {
      contentbitConfig,
      frontmatter: frontmatterProposals(scannedFiles),
      ...(seoConfig ? { seoConfig } : {}),
    },
  }
}

function countFrontmatter(frontmatters: Record<string, unknown>[]): AdoptionReport['frontmatter'] {
  const fields: Array<keyof AdoptionReport['frontmatter']> = [
    'slug',
    'key',
    'locale',
    'title',
    'description',
    'linksTo',
  ]
  const out = Object.fromEntries(fields.map((field) => [field, 0])) as AdoptionReport['frontmatter']
  for (const fm of frontmatters) {
    for (const field of fields) if (fm[field] !== undefined) out[field]++
  }
  return out
}

function inferLinkResolution(frontmatters: Record<string, unknown>[]): LinkResolveMode {
  const locales = valuesForField(frontmatters, 'locale')
  const hasKeys = frontmatters.some((fm) => stringValue(fm.key) !== undefined)
  if (locales.length > 1 && hasKeys) return 'prefer-same-locale-key-fallback-slug'
  if (locales.length > 1) return 'same-locale-slug'
  return 'global-slug'
}

function coverageByKey(frontmatters: Record<string, unknown>[]): AdoptionReport['localeCoverage'] {
  const coverage = new Map<string, Set<string>>()
  for (const fm of frontmatters) {
    const key = stringValue(fm.key)
    const locale = stringValue(fm.locale)
    if (!key || !locale) continue
    const locales = coverage.get(key) ?? new Set<string>()
    locales.add(locale)
    coverage.set(key, locales)
  }
  return [...coverage]
    .map(([key, locales]) => ({ key, locales: [...locales].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

function valuesForField(frontmatters: Record<string, unknown>[], field: string): string[] {
  return [
    ...new Set(
      frontmatters.map((fm) => stringValue(fm[field])).filter((value) => value !== undefined),
    ),
  ].sort()
}

function inferContracts(files: ContentProjectFileScan[], pageTypes: string[]): ContractProposal[] {
  return pageTypes.map((type) => {
    const members = files.filter((file) => stringValue(file.frontmatter.type) === type)
    const requiredFrontmatter = ['type']
    if (members.every((file) => stringValue(file.frontmatter.intent)))
      requiredFrontmatter.push('intent')
    if (members.every((file) => primaryKeyword(file.frontmatter))) {
      requiredFrontmatter.push('keywords.primary')
    }
    const sectionSets = members.map(
      (file) =>
        new Set(
          file.stats.outline
            .filter((heading) => heading.level === 2)
            .map((heading) => heading.text),
        ),
    )
    const requiredSections =
      sectionSets.length === 0
        ? []
        : [...sectionSets[0]]
            .filter((section) => sectionSets.every((set) => set.has(section)))
            .sort()
    return { type, files: members.length, requiredFrontmatter, requiredSections }
  })
}

function primaryKeyword(frontmatter: Record<string, unknown>): string | undefined {
  const keywords = frontmatter.keywords
  if (!keywords || typeof keywords !== 'object' || Array.isArray(keywords)) return undefined
  return stringValue((keywords as Record<string, unknown>).primary)
}

function frontmatterProposals(
  files: ContentProjectFileScan[],
): AdoptionReport['proposals']['frontmatter'] {
  const proposals: AdoptionReport['proposals']['frontmatter'] = []
  for (const file of files) {
    const add: Record<string, string> = {}
    if (!stringValue(file.frontmatter.slug)) add.slug = slugFromPath(file.path)
    if (!stringValue(file.frontmatter.title)) {
      add.title = file.stats.outline[0]?.text ?? titleFromPath(file.path)
    }
    if (Object.keys(add).length > 0) proposals.push({ path: file.path, add })
  }
  return proposals
}

function slugFromPath(path: string): string {
  return titleFromPath(path)
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromPath(path: string): string {
  const filename = path.slice(path.lastIndexOf('/') + 1).replace(/\.mdx?$/i, '')
  return filename.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function contentbitConfigProposal(globs: string[], resolve: LinkResolveMode): string {
  const content =
    globs.length === 1 ? singleQuoted(globs[0]) : `[${globs.map(singleQuoted).join(', ')}]`
  return `import { defineContentConfig } from '@contentbit/core'

export default defineContentConfig({
  content: ${content},
  links: {
    resolve: '${resolve}',
  },
})
`
}

function seoConfigProposal(contracts: ContractProposal[]): string {
  const pageTypes = contracts
    .map((contract) => {
      const fields = [`requiredFrontmatter: ${JSON.stringify(contract.requiredFrontmatter)}`]
      if (contract.requiredSections.length > 0) {
        const sections = contract.requiredSections.map((heading) => ({
          id: heading
            .toLocaleLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
          headings: [heading],
        }))
        fields.push(`requiredSections: ${JSON.stringify(sections)}`)
      }
      return `    ${JSON.stringify(contract.type)}: { ${fields.join(', ')} },`
    })
    .join('\n')
  return `import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  // Generated from existing page types. Review each contract before enabling it in CI.
  pageTypes: {
${pageTypes}
  },
  pages: {},
})
`
}

function singleQuoted(value: string): string {
  return `'${value.replaceAll("'", "\\'")}'`
}

function formatAdoptionReport(report: AdoptionReport): string {
  const lines = [
    section('contentbit adopt'),
    '',
    color('Read-only adoption report — no files were changed.', 'info'),
    '',
    section('Inventory'),
    ...formatRows([
      { label: 'Files', value: report.files },
      { label: 'Slugs', value: report.frontmatter.slug },
      { label: 'Keys', value: report.frontmatter.key },
      { label: 'Locales', value: report.frontmatter.locale },
      { label: 'Links', value: report.frontmatter.linksTo },
      {
        label: 'Findings',
        value: report.findings.length,
        tone: report.findings.length > 0 ? 'warning' : 'success',
      },
    ]),
    '',
    section('Inferred Link Strategy'),
    `  ${report.inferred.links.resolve}`,
  ]
  if (report.localeCoverage.length > 0) {
    lines.push('', section('Locale Coverage'))
    for (const item of report.localeCoverage)
      lines.push(`  ${item.key}: ${item.locales.join(', ')}`)
  }
  if (report.proposals.frontmatter.length > 0) {
    lines.push('', section('Suggested Frontmatter Repairs'))
    for (const proposal of report.proposals.frontmatter) {
      const fields = Object.entries(proposal.add)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ')
      lines.push(`  ${proposal.path}: ${fields}`)
    }
  }
  lines.push(
    '',
    section('Suggested contentbit.config.ts'),
    '```ts',
    report.proposals.contentbitConfig.trimEnd(),
    '```',
  )
  if (report.proposals.seoConfig) {
    lines.push(
      '',
      section('Suggested contentbit.seo.config.ts'),
      '```ts',
      report.proposals.seoConfig.trimEnd(),
      '```',
    )
  }
  lines.push('', 'Copy, adapt, and review these proposals before creating files.')
  return lines.join('\n')
}
