import { existsSync, watch as watchDirectory, type FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import {
  DEFAULT_MIN_SECTION_WORDS,
  type ContentProjectFinding,
  type LinkInput,
  type LinkResolverOptions,
} from '@contentbit/core'

import type { Io } from '../run.js'

import {
  color,
  displayPath,
  formatCommandList,
  formatRows,
  section,
  severityLabel,
} from '../cli-format.js'
import { loadContentProject } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'
import { discoverContentCommandDefaults } from '../script-defaults.js'
import auditSkill from './agent-templates/contentbit-audit/SKILL.md?raw'
import authorSkill from './agent-templates/contentbit-author/SKILL.md?raw'

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
  const first = await doctorOnce(input, io)
  if (!input.watch) return first.exitCode
  return watchDoctor(input, io, first.files)
}

interface DoctorRun {
  exitCode: number
  files: string[]
}

async function doctorOnce(input: DoctorCommandInput, io: Io): Promise<DoctorRun> {
  const defaults = await discoverContentCommandDefaults('doctor', input.globs)
  const minSectionWords = parseMinSectionWords(input.minSectionWords)
  if (minSectionWords === null) {
    io.stderr('doctor: --min-section-words must be a non-negative integer.')
    return { exitCode: 2, files: [] }
  }

  const includeGenericBlocks = !(input.noGenericBlocks || defaults.noGenericBlocks)
  const linkOptions = linkResolverOptions({
    linkResolve: input.linkResolve ?? defaults.linkResolve,
    localeField: input.localeField ?? defaults.localeField,
    slugField: input.slugField ?? defaults.slugField,
    keyField: input.keyField ?? defaults.keyField,
    defaultLocale: input.defaultLocale ?? defaults.defaultLocale,
  })
  const seoConfig = await loadSeoConfig({
    cwd: defaults.cwd,
    seoConfig: input.seoConfig ?? defaults.seoConfig,
    noSeo: input.noSeo ?? defaults.noSeo,
  })
  const { files, scan } = await loadContentProject({
    cmd: 'doctor',
    positionals: defaults.globs,
    cwd: defaults.cwd,
    registry: input.registry ?? defaults.registry,
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
        defaults.globs,
        input.registry ?? defaults.registry,
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
        .then(() => io.stdout('\nWatching for changes…'))
        .catch((error) =>
          io.stderr(
            `doctor: watch scan failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
    }, 100)
  }
  for (const directory of directories) {
    const watcher = watchDirectory(directory, { persistent: true }, rerun)
    watcher.on('error', (error) =>
      io.stderr(`doctor: watch failed for ${directory}: ${error.message}`),
    )
    watchers.push(watcher)
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
}

function parseMinSectionWords(value: string | undefined): number | null {
  if (value === undefined) return DEFAULT_MIN_SECTION_WORDS
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}

function hasAliases(inputs: LinkInput[]): boolean {
  return inputs.some((input) => Array.isArray(input.data.aliases) && input.data.aliases.length > 0)
}

const SHIPPED_SKILLS = [
  { name: 'contentbit-author', content: authorSkill },
  { name: 'contentbit-audit', content: auditSkill },
] as const

async function skillDriftFindings(files: string[]): Promise<DoctorFinding[]> {
  const root = findInstalledSkillRoot(files)
  if (!root) return []

  const findings: DoctorFinding[] = []
  for (const skill of SHIPPED_SKILLS) {
    const shipped = skillVersion(skill.content)
    if (!shipped.value) continue

    const path = join(root, '.claude/skills', skill.name, 'SKILL.md')
    if (!existsSync(path)) continue

    const installedContent = await readFile(path, 'utf8')
    const installed = skillVersion(installedContent)
    if (installed.value === shipped.value) continue

    findings.push({
      severity: 'warning',
      source: 'agents',
      code: 'CB_SKILL_DRIFT',
      file: path,
      line: installed.line ?? 1,
      column: 1,
      message: `${skill.name} skill is stale (installed version ${installed.value ?? 'unknown'}, package ships ${shipped.value}).`,
      hint: 'Re-run contentbit agents from this project to refresh Claude Code skills.',
    })
  }
  return findings
}

function findInstalledSkillRoot(files: string[]): string | undefined {
  const home = homedir()
  for (const file of files) {
    let current = dirname(file)
    while (true) {
      if (current === home) break
      if (hasInstalledContentbitSkill(current)) return current
      if (existsSync(join(current, 'package.json'))) break
      const parent = dirname(current)
      if (parent === current) break
      current = parent
    }
  }
  return undefined
}

function hasInstalledContentbitSkill(root: string): boolean {
  return SHIPPED_SKILLS.some((skill) =>
    existsSync(join(root, '.claude/skills', skill.name, 'SKILL.md')),
  )
}

function skillVersion(content: string): { value?: string; line?: number } {
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^version:\s*['"]?([^'"\s]+)['"]?\s*$/)
    if (match) return { value: match[1], line: i + 1 }
  }
  return {}
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

function formatFinding(index: number, finding: DoctorFinding): string[] {
  const location =
    finding.line !== undefined && finding.column !== undefined
      ? `${displayPath(finding.file)}:${finding.line}:${finding.column}`
      : displayPath(finding.file)
  const lines = [
    `  ${index}. ${severityLabel(finding.severity)} ${finding.source} ${finding.code}`,
    `     ${color('at', 'muted')} ${location}`,
    `     ${finding.message}`,
  ]
  if (finding.hint) lines.push(`     ${color('hint', 'muted')} ${finding.hint}`)
  return lines
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
