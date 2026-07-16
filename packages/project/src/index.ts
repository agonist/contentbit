import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  createLinkGraphView,
  discoverContentProject,
  scanContentProject,
  summarizeContentProjectFindings,
  type BlockDefinition,
  type BlockRegistry,
  type ContentProjectFinding,
  type ContentProjectFindingSummary,
  type ContentProjectScan,
  type ContentProjectSourceFile,
  type DiscoveredContentPageFacts,
  type LinkGraphView,
  type LinkResolverOptions,
  type ScanContentProjectOptions,
} from '@contentbit/core'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { glob } from 'tinyglobby'

export class ProjectLoadError extends Error {
  constructor(
    readonly exitCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ProjectLoadError'
  }
}

export interface ResolveContentFilesOptions {
  cwd?: string
  allowEmpty?: boolean
}

export async function resolveContentFiles(
  positionals: string[],
  cmd: string,
  options: ResolveContentFilesOptions = {},
): Promise<string[]> {
  if (positionals.length === 0) {
    if (options.allowEmpty) return []
    throw new ProjectLoadError(2, `${cmd}: provide at least one file or glob.`)
  }
  const files = (await glob(positionals, { absolute: true, cwd: options.cwd })).sort()
  if (files.length === 0) {
    if (options.allowEmpty) return []
    throw new ProjectLoadError(2, `${cmd}: no files matched ${positionals.join(' ')}`)
  }
  return files
}

export interface LoadRegistryOptions {
  cwd?: string
  includeGenericBlocks?: boolean
}

export async function loadRegistry(
  registryPath?: string,
  options: LoadRegistryOptions = {},
): Promise<BlockRegistry> {
  const registry = createBlockRegistry()
  if (options.includeGenericBlocks !== false) registry.use(genericBlocks())
  if (!registryPath) return registry

  const resolvedPath = isAbsolute(registryPath)
    ? registryPath
    : join(options.cwd ?? process.cwd(), registryPath)
  let mod: { default?: BlockDefinition<unknown>[] }
  try {
    mod = (await import(pathToFileURL(resolvedPath).href)) as typeof mod
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
      throw new Error(
        `Importing a TypeScript registry needs Node 22.18+ (native type stripping): ${resolvedPath}`,
      )
    }
    throw err
  }
  if (!Array.isArray(mod.default)) {
    throw new Error(
      `--registry module must default-export an array of block definitions: ${resolvedPath}`,
    )
  }
  registry.use(mod.default)
  return registry
}

export interface LoadContentProjectInput {
  cmd: string
  positionals: string[]
  cwd?: string
  registry?: string
  includeGenericBlocks?: boolean
  linkOptions?: LinkResolverOptions
  scan?: Omit<ScanContentProjectOptions, 'linkOptions'>
  allowEmpty?: boolean
}

export interface LoadedContentProject {
  files: string[]
  registry: BlockRegistry
  sources: ContentProjectSourceFile[]
  linkOptions: LinkResolverOptions
  scan: ContentProjectScan
}

export async function loadContentProject(
  input: LoadContentProjectInput,
): Promise<LoadedContentProject> {
  const files = await resolveContentFiles(input.positionals, input.cmd, {
    cwd: input.cwd,
    allowEmpty: input.allowEmpty,
  })
  const registry = await loadRegistry(input.registry, {
    cwd: input.cwd,
    includeGenericBlocks: input.includeGenericBlocks,
  })
  const sources = await Promise.all(
    files.map(async (path) => ({ path, source: await readFile(path, 'utf8') })),
  )
  const linkOptions = input.linkOptions ?? {}
  const scan = scanContentProject(sources, registry, {
    linkOptions,
    ...input.scan,
  })
  return { files, registry, sources, linkOptions, scan }
}

export const CONTENT_PROJECT_SNAPSHOT_SCHEMA_VERSION = 'contentbit.project-snapshot.v1' as const

export type ContentProjectSnapshotStatus = 'error' | 'warning' | 'suggestion' | 'healthy'

export interface ContentProjectSnapshotFinding extends Omit<ContentProjectFinding, 'file'> {
  file: string
}

export interface ContentProjectSnapshotPage {
  path: string
  contentHash: string
  facts: DiscoveredContentPageFacts
  stats: {
    bytes: number
    words: number
    readingMinutes: number
    outline: Array<{ level: number; text: string; line: number; words: number }>
    blocks: { total: number; byName: Record<string, number> }
    links: { total: number; internal: number; external: number }
    images: { total: number; missingAlt: number }
  }
  findings: ContentProjectFindingSummary
  status: ContentProjectSnapshotStatus
}

export interface ContentProjectSnapshot {
  schemaVersion: typeof CONTENT_PROJECT_SNAPSHOT_SCHEMA_VERSION
  revision?: string
  summary: {
    files: number
    words: number
    blocks: number
    links: number
    findings: ContentProjectFindingSummary
  }
  pages: ContentProjectSnapshotPage[]
  families: Array<{ id: string; files: number }>
  locales: Array<{ id: string; files: number }>
  findings: ContentProjectSnapshotFinding[]
  graph?: LinkGraphView
  seo?: {
    schemaVersion: string
    pages: number
    existing: number
    planned: number
    findings: number
  }
}

export interface InspectContentProjectInput extends Omit<LoadContentProjectInput, 'cmd'> {
  revision?: string
}

/** Load an authored project and return the portable, JSON-safe read model used
 * by remote adapters. Raw Markdown, validation ASTs, registries, absolute
 * paths, and runtime objects stay behind this interface. */
export async function inspectContentProject(
  input: InspectContentProjectInput,
): Promise<ContentProjectSnapshot> {
  const root = input.cwd ?? process.cwd()
  const project = await loadContentProject({ ...input, cmd: 'snapshot' })
  const discovery = discoverContentProject(project.scan.files, {
    root,
    ...project.linkOptions,
  })
  const discoveredBySource = new Map(
    discovery.pages.map((page) => [page.sourcePath, page] as const),
  )
  const findings = project.scan.findings.map((finding) => ({
    ...finding,
    file: portablePath(finding.file, root),
    message: portableText(finding.message, root),
    ...(finding.hint ? { hint: portableText(finding.hint, root) } : {}),
  }))
  let words = 0
  let blocks = 0
  let links = 0
  const pages = project.scan.files.map((file): ContentProjectSnapshotPage => {
    const discovered = discoveredBySource.get(file.path)
    if (!discovered) throw new Error(`Missing discovered page for ${file.path}`)
    words += file.stats.length.words
    blocks += file.stats.blocks.total
    links += file.stats.links.total
    const pageFindings = summarizeContentProjectFindings(file.findings)
    return {
      path: discovered.path,
      contentHash: createHash('sha256').update(file.source).digest('hex'),
      facts: discovered.facts,
      stats: {
        bytes: file.stats.file.bytes,
        words: file.stats.length.words,
        readingMinutes: file.stats.length.readingMinutes,
        outline: file.stats.outline,
        blocks: { total: file.stats.blocks.total, byName: file.stats.blocks.byName },
        links: {
          total: file.stats.links.total,
          internal: file.stats.links.internal,
          external: file.stats.links.external,
        },
        images: file.stats.images,
      },
      findings: pageFindings,
      status: snapshotStatus(pageFindings),
    }
  })
  const graph = snapshotGraph(project.scan, root)

  return {
    schemaVersion: CONTENT_PROJECT_SNAPSHOT_SCHEMA_VERSION,
    ...(input.revision ? { revision: input.revision } : {}),
    summary: {
      files: pages.length,
      words,
      blocks,
      links,
      findings: project.scan.summary,
    },
    pages,
    families: discovery.families,
    locales: discovery.locales,
    findings,
    ...(graph ? { graph } : {}),
    ...(project.scan.seo
      ? {
          seo: {
            schemaVersion: project.scan.seo.schemaVersion,
            pages: project.scan.seo.pages.length,
            existing: project.scan.seo.pages.filter((page) => page.source === 'existing').length,
            planned: project.scan.seo.pages.filter((page) => page.source === 'planned').length,
            findings: project.scan.seo.findings.length,
          },
        }
      : {}),
  }
}

function snapshotGraph(scan: ContentProjectScan, root: string): LinkGraphView | undefined {
  if (!scan.linkIndex) return undefined
  const graph = createLinkGraphView(scan.linkIndex, scan.linkDiagnostics ?? [])
  return {
    summary: graph.summary,
    nodes: graph.nodes.map((node) => ({ ...node, path: portablePath(node.path, root) })),
    edges: graph.edges,
  }
}

function snapshotStatus(summary: ContentProjectFindingSummary): ContentProjectSnapshotStatus {
  if (summary.errors > 0) return 'error'
  if (summary.warnings > 0) return 'warning'
  if (summary.suggestions > 0) return 'suggestion'
  return 'healthy'
}

function portablePath(path: string, root: string): string {
  const value = isAbsolute(path) ? relative(root, path) : path
  return value.replaceAll('\\', '/')
}

function portableText(value: string, root: string): string {
  const normalized = value.replaceAll('\\', '/')
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/$/, '')
  return normalized.replaceAll(`${normalizedRoot}/`, '')
}
