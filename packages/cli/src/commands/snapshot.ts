import { inspectContentProject } from '@contentbit/project'

import type { Io } from '../run.js'

import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'
import { discoverContentCommandDefaults } from '../script-defaults.js'

export interface SnapshotCommandInput extends LinkOptionValues {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  seoConfig?: string
  noSeo?: boolean
  revision?: string
}

export async function snapshotCommand(input: SnapshotCommandInput, io: Io): Promise<number> {
  const defaults = await discoverContentCommandDefaults('snapshot', input.globs)
  const seoConfig = await loadSeoConfig({
    cwd: defaults.cwd,
    seoConfig: input.seoConfig ?? defaults.seoConfig,
    noSeo: input.noSeo ?? defaults.noSeo,
  })
  const snapshot = await inspectContentProject({
    positionals: defaults.globs,
    cwd: defaults.cwd,
    registry: input.registry ?? defaults.registry,
    includeGenericBlocks: !(input.noGenericBlocks || defaults.noGenericBlocks),
    linkOptions: linkResolverOptions({
      linkResolve: input.linkResolve ?? defaults.linkResolve,
      localeField: input.localeField ?? defaults.localeField,
      slugField: input.slugField ?? defaults.slugField,
      keyField: input.keyField ?? defaults.keyField,
      defaultLocale: input.defaultLocale ?? defaults.defaultLocale,
    }),
    scan: { seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
    revision: input.revision,
  })
  io.stdout(JSON.stringify(snapshot, null, 2))
  return 0
}
