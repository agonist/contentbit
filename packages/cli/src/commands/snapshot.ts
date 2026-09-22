import { inspectContentProject } from '@contentbit/project'

import type { Io } from '../run.js'

import { resolveContentCommandConfig } from '../command-config.js'
import type { LinkOptionValues } from '../link-options.js'

export interface SnapshotCommandInput extends LinkOptionValues {
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  seoConfig?: string
  noSeo?: boolean
  revision?: string
}

export async function snapshotCommand(input: SnapshotCommandInput, io: Io): Promise<number> {
  const config = await resolveContentCommandConfig('snapshot', input)
  const seoConfig = await config.loadSeo()
  const snapshot = await inspectContentProject({
    positionals: config.globs,
    cwd: config.cwd,
    registry: config.registry,
    includeGenericBlocks: config.includeGenericBlocks,
    linkOptions: config.resolveLinkOptions(),
    scan: { seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
    revision: input.revision,
  })
  io.stdout(JSON.stringify(snapshot, null, 2))
  return 0
}
