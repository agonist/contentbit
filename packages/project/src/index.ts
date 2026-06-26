import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  scanContentProject,
  type BlockDefinition,
  type BlockRegistry,
  type ContentProjectScan,
  type ContentProjectSourceFile,
  type LinkResolverOptions,
  type ScanContentProjectOptions,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
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
