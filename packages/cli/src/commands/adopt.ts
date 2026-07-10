import type { ContentProjectFinding, LinkResolveMode } from '@contentbit/core'

import type { Io } from '../run.js'

import { color, formatRows, section } from '../cli-format.js'
import { loadContentProject } from '../content-project.js'

const DEFAULT_ADOPT_GLOBS = ['content/**/*.{md,mdx}']
const ADOPTION_SCHEMA_VERSION = 'contentbit.adoption.v1'

export interface AdoptCommandInput {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  json?: boolean
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
  }
  localeCoverage: Array<{ key: string; locales: string[] }>
  findings: ContentProjectFinding[]
  proposals: { contentbitConfig: string; seoConfig?: string }
}

/** Inspect an existing Markdown library and print reviewable setup proposals.
 * This command intentionally has no write path: adoption starts with an audit,
 * so a project owner chooses what becomes configuration or source edits. */
export async function adoptCommand(input: AdoptCommandInput, io: Io): Promise<number> {
  const globs = input.globs.length > 0 ? input.globs : DEFAULT_ADOPT_GLOBS
  const { files, scan } = await loadContentProject({
    cmd: 'adopt',
    positionals: globs,
    registry: input.registry,
    includeGenericBlocks: !input.noGenericBlocks,
  })
  const report = createAdoptionReport(
    globs,
    files.length,
    scan.findings,
    scan.files.map((file) => file.frontmatter),
  )

  if (input.json) io.stdout(JSON.stringify(report, null, 2))
  else io.stdout(formatAdoptionReport(report))
  return 0
}

function createAdoptionReport(
  globs: string[],
  files: number,
  findings: ContentProjectFinding[],
  frontmatters: Record<string, unknown>[],
): AdoptionReport {
  const frontmatter = countFrontmatter(frontmatters)
  const links = inferLinkResolution(frontmatters)
  const pageTypes = valuesForField(frontmatters, 'type')
  const localeCoverage = coverageByKey(frontmatters)
  const contentbitConfig = contentbitConfigProposal(globs, links)
  const seoConfig = pageTypes.length > 0 ? seoConfigProposal(pageTypes) : undefined
  return {
    schemaVersion: ADOPTION_SCHEMA_VERSION,
    dryRun: true,
    files,
    frontmatter,
    inferred: { content: globs, links: { resolve: links }, pageTypes },
    localeCoverage,
    findings,
    proposals: { contentbitConfig, ...(seoConfig ? { seoConfig } : {}) },
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

function seoConfigProposal(pageTypes: string[]): string {
  return `import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  // Observed page types: ${pageTypes.join(', ')}
  // Turn the types you want to govern into contracts before enabling this file.
  pageTypes: {},
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
