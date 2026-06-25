import {
  scanContentProject,
  type BlockRegistry,
  type ContentProjectScan,
  type ContentProjectSourceFile,
  type LinkResolverOptions,
} from '@contentbit/core'
import { readFile } from 'node:fs/promises'
import { glob } from 'tinyglobby'

import { loadRegistry } from './load-registry.js'
import { CliError } from './run.js'

/** Glob the positionals into sorted absolute paths. Throws CliError (exit 2). */
export async function resolveContentFiles(positionals: string[], cmd: string): Promise<string[]> {
  if (positionals.length === 0) {
    throw new CliError(2, `${cmd}: provide at least one file or glob.`)
  }
  const files = (await glob(positionals, { absolute: true })).sort()
  if (files.length === 0) {
    throw new CliError(2, `${cmd}: no files matched ${positionals.join(' ')}`)
  }
  return files
}

export interface LoadContentProjectInput {
  /** Command name, used to namespace input-error messages. */
  cmd: string
  positionals: string[]
  /** Path to a user `--registry` module, if any. */
  registry?: string
  includeGenericBlocks: boolean
  linkOptions: LinkResolverOptions
  /** Forwarded to `scanContentProject` (per-command knobs). */
  scan?: { includeStatsFindings?: boolean; minSectionWords?: number }
}

export interface LoadedContentProject {
  files: string[]
  registry: BlockRegistry
  sources: ContentProjectSourceFile[]
  linkOptions: LinkResolverOptions
  scan: ContentProjectScan
}

/**
 * The "loaded content project" seam: turns (positional globs, flags) into a
 * ready-to-use project — resolved files, loaded registry, read sources, and the
 * produced content project scan. The single input path shared by the `validate`,
 * `doctor`, and `stats` read-commands. Throws CliError on input failures.
 */
export async function loadContentProject(
  input: LoadContentProjectInput,
): Promise<LoadedContentProject> {
  const files = await resolveContentFiles(input.positionals, input.cmd)
  const registry = await loadRegistry(input.registry, {
    includeGenericBlocks: input.includeGenericBlocks,
  })
  const sources = await Promise.all(
    files.map(async (path) => ({ path, source: await readFile(path, 'utf8') })),
  )
  const scan = scanContentProject(sources, registry, {
    linkOptions: input.linkOptions,
    ...input.scan,
  })
  return { files, registry, sources, linkOptions: input.linkOptions, scan }
}
