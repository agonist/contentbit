import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import {
  createSiteCheck,
  httpOrigin,
  inferOrigin,
  readBuildFolder,
  type BuiltSite,
  type SiteCheck,
  type SiteOrigin,
} from '@contentbit/built-site'

import { CliError, type Io } from '../run.js'

import { displayPath, formatFinding, formatRows, section } from '../cli-format.js'
import {
  resolveContentCommandConfig,
  type ResolvedContentCommandConfig,
} from '../command-config.js'
import { loadContentProject } from '../content-project.js'
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

  const [site, content] = await Promise.all([
    buildPath === undefined ? undefined : readBuild(buildPath),
    checkMarkdown(config),
  ])
  if (!site && !content) {
    const folders = searched.map(displayPath)
    throw new CliError(
      2,
      `check: nothing to check. No build folder in ${folders.slice(0, -1).join(', ')} or ${folders.at(-1)}, and no Markdown files from a contentbit config. Build the site first or pass its folder: contentbit check <folder>`,
    )
  }

  const check = createSiteCheck({
    input: site ? { kind: 'folder', path: site.root } : { kind: 'none', searched },
    site,
    origin: resolveOrigin(flagOrigin, config.site?.origin, site),
    findings: [],
    content,
  })
  io.stdout(input.json ? JSON.stringify(check, null, 2) : formatCheck(check))
  if (!site) {
    io.stderr(
      `check: no build folder was found, so only the Markdown checks ran. Build the site first with ${await buildCommand(root)}, or pass its folder: contentbit check <folder>`,
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

async function checkMarkdown(
  config: ResolvedContentCommandConfig,
): Promise<SiteCheck['content'] | undefined> {
  if (config.globs.length === 0) return undefined
  const seoConfig = await config.loadSeo()
  const { files, scan } = await loadContentProject({
    cmd: 'check',
    positionals: config.globs,
    cwd: config.cwd,
    registry: config.registry,
    includeGenericBlocks: config.includeGenericBlocks,
    linkOptions: config.resolveLinkOptions(),
    scan: { seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
    allowEmpty: true,
  })
  return files.length === 0 ? undefined : { files: files.length, findings: scan.findings }
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
  const { input, origin, content, summary } = check
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

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
