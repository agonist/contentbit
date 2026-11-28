import { watch as watchDirectory, type Dirent, type FSWatcher } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

import {
  DEFAULT_MIN_SECTION_WORDS,
  type ContentProjectFinding,
  type LinkInput,
  type LinkResolverOptions,
} from '@contentbit/core'

import type { Io } from '../run.js'

import { color, formatCommandList, formatFinding, formatRows, section } from '../cli-format.js'
import { resolveContentCommandConfig } from '../command-config.js'
import { loadContentProject } from '../content-project.js'
import type { LinkOptionValues } from '../link-options.js'
import { skillDriftFindings } from './skill-drift.js'

type DoctorFindingSource = ContentProjectFinding['source'] | 'agents'

interface DoctorFinding extends Omit<ContentProjectFinding, 'source'> {
  source: DoctorFindingSource
}

interface DoctorReport {
  files: number
  summary: { errors: number; warnings: number; suggestions: number }
  linkGraph?: { pages: number; links: number; orphans: number }
  seo?: {
    schemaVersion: string
    pages: number
    findings: DoctorFinding[]
  }
  findings: DoctorFinding[]
}

export interface DoctorCommandInput extends LinkOptionValues {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  strictWarnings?: boolean
  strictSeo?: boolean
  json?: boolean
  minSectionWords?: string
  seoConfig?: string
  noSeo?: boolean
  watch?: boolean
}

export async function doctorCommand(input: DoctorCommandInput, io: Io): Promise<number> {
  if (input.watch && input.json) {
    io.stderr('doctor: --watch cannot be combined with --json.')
    return 2
  }
  const first = await doctorOnce(input, io)
  if (!input.watch) return first.exitCode
  return watchDoctor(input, io, first.files)
}

interface DoctorRun {
  exitCode: number
  files: string[]
}

async function doctorOnce(input: DoctorCommandInput, io: Io): Promise<DoctorRun> {
  const config = await resolveContentCommandConfig('doctor', input)
  const minSectionWords = parseMinSectionWords(input.minSectionWords)
  if (minSectionWords === null) {
    io.stderr('doctor: --min-section-words must be a non-negative integer.')
    return { exitCode: 2, files: [] }
  }

  const includeGenericBlocks = config.includeGenericBlocks
  const linkOptions = config.resolveLinkOptions()
  const seoConfig = await config.loadSeo()
  const { files, scan } = await loadContentProject({
    cmd: 'doctor',
    positionals: config.globs,
    cwd: config.cwd,
    registry: config.registry,
    includeGenericBlocks,
    linkOptions,
    scan: { minSectionWords, seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
  })
  const report: DoctorReport = {
    files: files.length,
    summary: scan.summary,
    ...(scan.linkGraph ? { linkGraph: scan.linkGraph } : {}),
    ...(scan.seo
      ? {
          seo: {
            schemaVersion: scan.seo.schemaVersion,
            pages: scan.seo.pages.length,
            findings: scan.seo.findings,
          },
        }
      : {}),
    findings: [],
  }
  report.findings = [...scan.findings, ...(await skillDriftFindings(files))]
  report.summary = summarizeFindings(report.findings)

  if (input.json) io.stdout(JSON.stringify(report, null, 2))
  else
    io.stdout(
      formatReport(
        report,
        config.globs,
        config.registry,
        includeGenericBlocks,
        linkOptions,
        hasAliases(scan.linkInputs),
      ),
    )

  if (report.summary.errors > 0) return { exitCode: 1, files }
  if (report.summary.warnings > 0 && input.strictWarnings) return { exitCode: 1, files }
  if (input.strictSeo && report.seo?.findings.some((finding) => finding.severity === 'warning')) {
    return { exitCode: 1, files }
  }
  return { exitCode: 0, files }
}

/** Keep a local Doctor session in sync with the directories that supplied its
 * initial content files. The next scan resolves the glob again, so additions
 * and deletions in an already-watched directory are picked up too. */
async function watchDoctor(
  input: DoctorCommandInput,
  io: Io,
  initialFiles: string[],
): Promise<number> {
  const directories = [...new Set(initialFiles.map(dirname))]
  const watchers: FSWatcher[] = []
  const watchedDirectories = new Set<string>()
  const fallbackRoots: string[] = []
  let pending: ReturnType<typeof setTimeout> | undefined
  let stopped = false

  const close = () => {
    if (stopped) return
    stopped = true
    if (pending) clearTimeout(pending)
    for (const watcher of watchers) watcher.close()
  }
  const rerun = () => {
    if (pending || stopped) return
    pending = setTimeout(() => {
      pending = undefined
      void doctorOnce(input, io)
        .then(async () => {
          await Promise.all(fallbackRoots.map((root) => addFallbackWatchers(root)))
          io.stdout('\nWatching for changes…')
        })
        .catch((error) =>
          io.stderr(
            `doctor: watch scan failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
    }, 100)
  }
  const watchRoots = recursiveWatchRoots(directories)
  for (const root of watchRoots) {
    try {
      watchers.push(createWatcher(root, true, rerun, io))
      watchedDirectories.add(root)
    } catch {
      // Recursive watching is unavailable on some filesystems. Watch every
      // directory below the content root and extend that set after each scan,
      // so nested additions still trigger the shared Doctor pass.
      fallbackRoots.push(root)
      await addFallbackWatchers(root)
      break
    }
  }

  io.stdout('\nWatching for changes… Press Ctrl+C to stop.')
  return new Promise((resolve) => {
    const stop = () => {
      close()
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)
      resolve(0)
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })

  async function addFallbackWatchers(root: string): Promise<void> {
    for (const directory of await nestedDirectories(root)) {
      if (watchedDirectories.has(directory)) continue
      watchers.push(createWatcher(directory, false, rerun, io))
      watchedDirectories.add(directory)
    }
  }
}

function createWatcher(
  directory: string,
  recursive: boolean,
  rerun: () => void,
  io: Io,
): FSWatcher {
  const watcher = watchDirectory(directory, { persistent: true, recursive }, rerun)
  watcher.on('error', (error) =>
    io.stderr(`doctor: watch failed for ${directory}: ${error.message}`),
  )
  return watcher
}

function recursiveWatchRoots(directories: string[]): string[] {
  if (directories.length <= 1) return directories
  const parts = directories.map((directory) => directory.split(sep))
  const first = parts[0]
  const shared: string[] = []
  for (let index = 0; index < first.length; index++) {
    if (parts.some((items) => items[index] !== first[index])) break
    shared.push(first[index])
  }
  const root = shared.join(sep) || sep
  return [root]
}

async function nestedDirectories(root: string): Promise<string[]> {
  const directories = [root]
  for (let index = 0; index < directories.length; index++) {
    let entries: Dirent[]
    try {
      entries = await readdir(directories[index], { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      directories.push(join(directories[index], entry.name))
    }
  }
  return directories
}

function parseMinSectionWords(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_MIN_SECTION_WORDS
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}

function hasAliases(inputs: LinkInput[]): boolean {
  return inputs.some((input) => Array.isArray(input.data.aliases) && input.data.aliases.length > 0)
}

function summarizeFindings(findings: DoctorFinding[]): DoctorReport['summary'] {
  return {
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    suggestions: findings.filter((finding) => finding.severity === 'info').length,
  }
}

function formatReport(
  report: DoctorReport,
  globs: string[],
  registryPath: string | undefined,
  includeGenericBlocks: boolean,
  linkOptions: LinkResolverOptions,
  aliasFixMayApply: boolean,
): string {
  const lines: string[] = []
  lines.push(section('contentbit doctor'))
  lines.push('')
  lines.push(section('Health'))
  lines.push(
    ...formatRows([
      { label: 'Files', value: report.files },
      {
        label: 'Errors',
        value: report.summary.errors,
        tone: report.summary.errors > 0 ? 'error' : 'success',
      },
      {
        label: 'Warnings',
        value: report.summary.warnings,
        tone: report.summary.warnings > 0 ? 'warning' : 'success',
      },
      {
        label: 'Suggestions',
        value: report.summary.suggestions,
        tone: report.summary.suggestions > 0 ? 'info' : 'success',
      },
    ]),
  )
  if (report.linkGraph) {
    lines.push('')
    lines.push(section('Link Graph'))
    lines.push(
      ...formatRows([
        { label: 'Pages', value: report.linkGraph.pages },
        { label: 'Links', value: report.linkGraph.links },
        {
          label: 'Orphans',
          value: report.linkGraph.orphans,
          tone: report.linkGraph.orphans > 0 ? 'warning' : 'success',
        },
      ]),
    )
  }
  if (report.seo) {
    lines.push('')
    lines.push(section('SEO'))
    lines.push(
      ...formatRows([
        { label: 'Pages', value: report.seo.pages },
        {
          label: 'Findings',
          value: report.seo.findings.length,
          tone: report.seo.findings.length > 0 ? 'warning' : 'success',
        },
      ]),
    )
  }
  lines.push('')

  if (report.findings.length === 0) {
    lines.push(color('No findings. Content looks healthy.', 'success'))
  } else {
    lines.push(section('Repair Plan'))
    report.findings.forEach((finding, index) => {
      lines.push(...formatFinding(index + 1, finding))
    })
  }

  lines.push('')
  lines.push(section('Next Commands'))
  const registryArgs = formatRegistryArgs(registryPath, includeGenericBlocks)
  const linkArgs = formatLinkArgs(linkOptions)
  const commands = [`contentbit validate ${formatGlobs(globs)}${registryArgs}${linkArgs}`]
  if (report.linkGraph) {
    commands.push(`contentbit links ${formatGlobs(globs)}${linkArgs}`)
    if (aliasFixMayApply && report.summary.errors === 0)
      commands.push(`contentbit links ${formatGlobs(globs)}${linkArgs} --fix`)
  }
  commands.push(`contentbit doctor ${formatGlobs(globs)}${registryArgs}${linkArgs} --json`)
  lines.push(...formatCommandList(commands))
  return lines.join('\n')
}

function formatGlobs(globs: string[]): string {
  return globs.map(formatArg).join(' ')
}

function formatArg(value: string): string {
  return /\s/.test(value) || value.includes('*') || value.includes('?') || value.includes('[')
    ? JSON.stringify(value)
    : value
}

function formatRegistryArgs(
  registryPath: string | undefined,
  includeGenericBlocks: boolean,
): string {
  const args: string[] = []
  if (registryPath) args.push('--registry', formatArg(registryPath))
  if (!includeGenericBlocks) args.push('--no-generic-blocks')
  return args.length > 0 ? ` ${args.join(' ')}` : ''
}

function formatLinkArgs(options: LinkResolverOptions): string {
  const args: string[] = []
  if (options.resolve) args.push('--link-resolve', options.resolve)
  if (options.localeField) args.push('--locale-field', formatArg(options.localeField))
  if (options.slugField) args.push('--slug-field', formatArg(options.slugField))
  if (options.keyField) args.push('--key-field', formatArg(options.keyField))
  if (options.defaultLocale) args.push('--default-locale', formatArg(options.defaultLocale))
  return args.length > 0 ? ` ${args.join(' ')}` : ''
}
