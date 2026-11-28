import { existsSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { contentPageUrlResolver, readContentPageFacts } from '@contentbit/core'
import {
  attributeToSources,
  checkSite,
  createSiteCheck,
  elementParts,
  groupTemplateFindings,
  httpOrigin,
  inferOrigin,
  readBuildFolder,
  DEFAULT_SEVERITY_BY_CODE,
  siteSources,
  type BuiltSite,
  type FindingElement,
  type PagePath,
  type SiteCheck,
  type SiteFinding,
  type SiteFindingCode,
  type SiteFindingOrigin,
  type SiteOrigin,
  type SourceDocument,
} from '@contentbit/built-site'

import { CliError, type Io } from '../run.js'

import {
  color,
  displayPath,
  formatFinding,
  formatRows,
  section,
  severityLabel,
} from '../cli-format.js'
import {
  resolveContentCommandConfig,
  type ResolvedContentCommandConfig,
} from '../command-config.js'
import { loadContentProject, type LoadedContentProject } from '../content-project.js'
import type { LinkOptionValues } from '../link-options.js'

export interface CheckCommandInput extends LinkOptionValues {
  target?: string
  json?: boolean
  strict?: boolean
  origin?: string
  registry?: string
  noGenericBlocks?: boolean
  seoConfig?: string
  noSeo?: boolean
}

const BUILD_FOLDERS = ['dist/client', 'dist', 'out', 'build', 'public']

const BUILD_COMMANDS: Array<[dependency: string, command: string]> = [
  ['astro', 'astro build'],
  ['next', 'next build'],
  ['@11ty/eleventy', 'eleventy'],
]

const MARKDOWN_CODES_REPLACED_BY_BUILT_PAGES = new Set([
  'CB_H1_MISSING',
  'CB_INTERNAL_URL_UNRESOLVED',
  'CB_MARKDOWN_ANCHOR_UNRESOLVED',
])

const MAX_EXAMPLES = 5
const MAX_TEMPLATE_EXAMPLES = 3

const ORIGIN_SOURCES: Record<SiteOrigin['source'], string> = {
  flag: 'from --origin',
  config: 'from site.origin',
  canonicals: 'inferred from canonicals',
}

export async function checkCommand(input: CheckCommandInput, io: Io): Promise<number> {
  if (input.target !== undefined && /^https?:\/\//i.test(input.target)) {
    throw new CliError(
      2,
      `check: ${input.target} is a URL. check reads a build folder for now; checking a running server comes later.`,
    )
  }
  const flagOrigin = input.origin === undefined ? undefined : parseFlagOrigin(input.origin)
  const config = await resolveContentCommandConfig('check', { ...input, globs: [] })
  const root = config.cwd ?? process.cwd()
  const searched = BUILD_FOLDERS.map((folder) => join(root, folder))
  const buildPath =
    input.target !== undefined
      ? resolve(input.target)
      : (config.site?.buildPath ??
        searched.find((folder) => existsSync(join(folder, 'index.html'))))

  const [site, markdown] = await Promise.all([
    buildPath === undefined ? undefined : readBuild(buildPath),
    loadMarkdown(config),
  ])
  const content = markdown && { files: markdown.files.length, findings: markdown.scan.findings }
  if (!site && !content) {
    const folders = searched.map(displayPath)
    throw new CliError(
      2,
      `check: nothing to check. No build folder in ${folders.slice(0, -1).join(', ')} or ${folders.at(-1)}, and no Markdown files from a contentbit config. Build the site first or pass its folder: contentbit check <folder>`,
    )
  }

  const origin = resolveOrigin(flagOrigin, config.site?.origin, site)
  const sources =
    site &&
    siteSources(site, markdown ? await sourceDocuments(markdown) : [], {
      draftField: config.site?.draftField,
      dateField: config.site?.dateField,
      now: new Date(),
    })
  const findings =
    site && sources
      ? attributeToSources(
          checkSite(site, {
            origin: origin?.url,
            hostRoutes: config.resolveLinkOptions().hostRoutes,
            sources,
          }),
          sources.pages,
        )
      : []
  const check = createSiteCheck({
    input: site ? { kind: 'folder', path: site.root } : { kind: 'none', searched },
    site,
    origin,
    sources,
    findings: groupTemplateFindings(findings),
    content:
      site && content
        ? {
            ...content,
            findings: content.findings.filter(
              ({ code }) => !MARKDOWN_CODES_REPLACED_BY_BUILT_PAGES.has(code),
            ),
          }
        : content,
  })
  io.stdout(input.json ? JSON.stringify(check, null, 2) : formatCheck(check))
  if (!site) {
    io.stderr(
      `check: no build folder was found, so only the Markdown checks ran. Build the site first with ${await buildCommand(root)}, or pass its folder: contentbit check <folder>`,
    )
  } else if (check.staleSources) {
    io.stderr(
      `check: ${plural(check.staleSources.length, 'Markdown file')} changed after the build in ${displayPath(site.root)}, so its pages may not show them yet. Rebuild the site with ${await buildCommand(root)} and check again.`,
    )
  }

  const { errors, warnings } = check.summary
  return errors > 0 || (input.strict && warnings > 0) ? 1 : 0
}

function parseFlagOrigin(value: string): string {
  const origin = httpOrigin(value)
  if (!origin) {
    throw new CliError(
      2,
      `check: --origin must be an absolute http or https URL, not ${JSON.stringify(value)}.`,
    )
  }
  return origin
}

async function readBuild(path: string): Promise<BuiltSite> {
  try {
    return await readBuildFolder(path)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT')
      throw new CliError(2, `check: build folder not found: ${displayPath(path)}`)
    if (code === 'ENOTDIR') throw new CliError(2, `check: ${displayPath(path)} is not a folder.`)
    throw error
  }
}

async function loadMarkdown(
  config: ResolvedContentCommandConfig,
): Promise<LoadedContentProject | undefined> {
  if (config.globs.length === 0) return undefined
  const seoConfig = await config.loadSeo()
  const project = await loadContentProject({
    cmd: 'check',
    positionals: config.globs,
    cwd: config.cwd,
    registry: config.registry,
    includeGenericBlocks: config.includeGenericBlocks,
    linkOptions: config.resolveLinkOptions(),
    scan: { seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
    allowEmpty: true,
  })
  return project.files.length === 0 ? undefined : project
}

async function sourceDocuments({
  scan,
  linkOptions,
}: LoadedContentProject): Promise<SourceDocument[]> {
  const pageUrl = contentPageUrlResolver(linkOptions)
  return Promise.all(
    scan.files.map(async ({ path, source, frontmatter }) => {
      const facts = readContentPageFacts(frontmatter, linkOptions)
      const route = pageUrl?.(path, facts)
      const modifiedMs = (await stat(path)).mtimeMs
      return { file: path, text: source, ...(route !== undefined && { route }), facts, modifiedMs }
    }),
  )
}

function resolveOrigin(
  flag: string | undefined,
  configured: string | undefined,
  site: BuiltSite | undefined,
): SiteOrigin | undefined {
  if (flag) return { url: flag, source: 'flag' }
  if (configured) return { url: configured, source: 'config' }
  const inferred = site && inferOrigin(site)
  return inferred ? { url: inferred, source: 'canonicals' } : undefined
}

interface PackageManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

async function buildCommand(root: string): Promise<string> {
  const manifest = await readFile(join(root, 'package.json'), 'utf8')
    .then((text): PackageManifest => JSON.parse(text))
    .catch((): PackageManifest => ({}))
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
  const known = BUILD_COMMANDS.find(([dependency]) => dependency in dependencies)
  return known?.[1] ?? "your site's build command"
}

function formatCheck(check: SiteCheck): string {
  const { input, origin, findings, content, summary } = check
  const lines = [section('contentbit check'), '']
  lines.push(
    ...formatRows([
      {
        label: 'Build',
        value:
          input.kind === 'folder'
            ? `${displayPath(input.path)}, ${plural(summary.pages, 'page')}`
            : 'not found',
        tone: input.kind === 'folder' ? undefined : 'warning',
      },
      {
        label: 'Origin',
        value: origin ? `${origin.url} (${ORIGIN_SOURCES[origin.source]})` : 'unknown',
      },
      ...(content ? [{ label: 'Markdown', value: plural(content.files, 'file') }] : []),
    ]),
  )
  if (findings.length > 0) {
    lines.push('', section('Built-page findings'), ...formatSiteFindings(findings))
  }
  if (content && content.findings.length > 0) {
    lines.push('', section('Markdown findings'))
    content.findings.forEach((finding, index) => lines.push(...formatFinding(index + 1, finding)))
  }
  lines.push('')
  lines.push(
    ...formatRows([
      { label: 'Errors', value: summary.errors, tone: summary.errors > 0 ? 'error' : 'success' },
      {
        label: 'Warnings',
        value: summary.warnings,
        tone: summary.warnings > 0 ? 'warning' : 'success',
      },
    ]),
  )
  return lines.join('\n')
}

function formatSiteFindings(findings: SiteFinding[]): string[] {
  const groups = new Map<string, SiteFinding[]>()
  for (const finding of findings) {
    const key = `${finding.severity} ${finding.code}`
    const group = groups.get(key)
    if (group) group.push(finding)
    else groups.set(key, [finding])
  }
  const codes = Object.keys(DEFAULT_SEVERITY_BY_CODE) as SiteFindingCode[]
  const ordered = (['error', 'warning'] as const).flatMap((severity) =>
    codes.map((code) => ({ severity, code })),
  )

  const lines: string[] = []
  for (const { severity, code } of ordered) {
    const label = `${severityLabel(severity)} ${code}`
    const located: Array<{ place: string; page: PagePath; finding: SiteFinding }> = []
    for (const finding of groups.get(`${severity} ${code}`) ?? []) {
      const { origin } = finding
      if (origin.kind === 'template') {
        lines.push(`  ${label}  ${formatTemplate(origin, finding.occurrences ?? [])}`)
      } else {
        located.push({ place: formatPlace(origin), page: origin.page, finding })
      }
    }
    if (located.length === 0) continue

    const pages = new Set(located.map(({ page }) => page))
    lines.push(`  ${label}  ${plural(located.length, 'finding')} on ${plural(pages.size, 'page')}`)
    const { hint } = located[0].finding
    if (hint && located.every(({ finding }) => finding.hint === hint)) {
      lines.push(`     ${color('hint', 'muted')} ${hint}`)
    }
    for (const { place, finding } of located.slice(0, MAX_EXAMPLES)) {
      lines.push(`     ${color(place, 'muted')}  ${finding.message}`)
    }
    if (located.length > MAX_EXAMPLES) {
      lines.push(
        `     ${color(`and ${located.length - MAX_EXAMPLES} more, listed by contentbit check --json`, 'muted')}`,
      )
    }
  }
  return lines
}

function formatTemplate(
  { element, pages }: Extract<SiteFindingOrigin, { kind: 'template' }>,
  occurrences: NonNullable<SiteFinding['occurrences']>,
): string {
  const examples = pages.slice(0, MAX_TEMPLATE_EXAMPLES).map((page) => {
    const target = occurrences.find((occurrence) => occurrence.page === page)?.target
    return target === undefined ? page : `${page} (${target})`
  })
  if (pages.length > MAX_TEMPLATE_EXAMPLES) {
    examples.push(`${pages.length - MAX_TEMPLATE_EXAMPLES} more`)
  }
  const list =
    examples.length < 2
      ? examples.join('')
      : `${examples.slice(0, -1).join(', ')} and ${examples.at(-1)}`
  const subject = element === undefined ? '' : `${shortElement(element)} `
  return `${subject}on ${plural(pages.length, 'page')}: ${list}`
}

function shortElement(element: FindingElement): string {
  const parts = elementParts(element)
  if (!parts) return element
  const { landmark, selector } = parts
  const [tag, ...classes] = selector.split('.')
  const shown = [tag, ...classes.slice(0, 2)].join('.')
  return `${landmark} ${shown}${classes.length > 2 ? '…' : ''}`
}

function formatPlace(origin: Exclude<SiteFindingOrigin, { kind: 'template' }>): string {
  if (origin.kind === 'page') return origin.page
  const column = origin.column === undefined ? '' : `:${origin.column}`
  return `${displayPath(origin.file)}:${origin.line}${column}`
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
