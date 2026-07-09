import {
  loadContentProject as loadProjectContent,
  ProjectLoadError,
  resolveContentFiles as resolveProjectContentFiles,
  type LoadedContentProject,
  type LoadContentProjectInput,
  type ResolveContentFilesOptions,
} from '@contentbit/project'

import { CliError } from './run.js'

export type { LoadedContentProject, LoadContentProjectInput }

/** Glob the positionals into sorted absolute paths. Throws CliError (exit 2). */
export async function resolveContentFiles(
  positionals: string[],
  cmd: string,
  options: ResolveContentFilesOptions = {},
): Promise<string[]> {
  return withCliErrors(() => resolveProjectContentFiles(positionals, cmd, options))
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
  return withCliErrors(() => loadProjectContent(input))
}

async function withCliErrors<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch (err) {
    if (err instanceof ProjectLoadError) throw new CliError(err.exitCode, err.message)
    throw err
  }
}
