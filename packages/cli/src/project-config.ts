import type { ContentbitConfig, ContentbitConfigInput } from '@contentbit/core'
import { importFresh } from '@contentbit/project'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

const CONFIG_FILES = [
  'contentbit.config.ts',
  'contentbit.config.mts',
  'contentbit.config.mjs',
  'contentbit.config.js',
]

export interface LoadedContentbitConfig {
  config: ContentbitConfig
  cwd: string
  path: string
}

export async function loadContentbitConfig(
  startDir = process.cwd(),
  explicitPath?: string,
): Promise<LoadedContentbitConfig | undefined> {
  const path = explicitPath
    ? isAbsolute(explicitPath)
      ? explicitPath
      : resolve(startDir, explicitPath)
    : findConfig(startDir)
  if (!path) return undefined

  const mod = (await importFresh(path)) as { default?: ContentbitConfigInput }
  if (!mod.default || typeof mod.default !== 'object') {
    throw new Error(`Contentbit config must default-export a config object: ${path}`)
  }
  const content = normalizeContent(mod.default.content, path)
  return {
    config: { ...mod.default, content },
    cwd: dirname(path),
    path,
  }
}

/** A --registry flag was typed in the user's shell, so it resolves against the
 * current directory; a configured registry resolves against its config file. */
export function registryPath(
  flag: string | undefined,
  loaded: LoadedContentbitConfig | undefined,
): string | undefined {
  if (flag) return resolve(flag)
  const configured = loaded?.config.registry
  return configured && loaded ? resolve(loaded.cwd, configured) : undefined
}

function findConfig(startDir: string): string | undefined {
  let current = resolve(startDir)
  while (true) {
    for (const name of CONFIG_FILES) {
      const candidate = join(current, name)
      if (existsSync(candidate)) return candidate
    }
    // The nearest package.json is the project boundary: a config above it
    // belongs to another project and must not shadow this one's scripts.
    if (existsSync(join(current, 'package.json'))) return undefined
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

function normalizeContent(value: unknown, path: string): string[] {
  const content = typeof value === 'string' ? [value] : value
  if (
    !Array.isArray(content) ||
    content.length === 0 ||
    content.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw new Error(
      `Contentbit config "content" must be a non-empty string or string array: ${path}`,
    )
  }
  return content
}
