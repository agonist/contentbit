import { existsSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_SEO_CONFIG = 'contentbit.seo.config.ts'

export interface LoadSeoConfigInput {
  cwd?: string
  seoConfig?: string
  noSeo?: boolean
}

export interface LoadedSeoConfig {
  config?: unknown
  path?: string
}

export async function loadSeoConfig(input: LoadSeoConfigInput = {}): Promise<LoadedSeoConfig> {
  if (input.noSeo) return {}
  const cwd = input.cwd ?? process.cwd()
  const path = input.seoConfig
    ? isAbsolute(input.seoConfig)
      ? input.seoConfig
      : join(cwd, input.seoConfig)
    : join(cwd, DEFAULT_SEO_CONFIG)
  if (!input.seoConfig && !existsSync(path)) return {}
  const mod = (await import(pathToFileURL(path).href)) as { default?: unknown }
  if (mod.default === undefined) {
    throw new Error(`SEO config must default-export a config object: ${path}`)
  }
  return { config: mod.default, path }
}
