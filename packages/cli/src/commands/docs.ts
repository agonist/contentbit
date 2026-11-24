import type { Io } from '../run.js'

import { loadRegistry } from '../content-project.js'
import { loadContentbitConfig, registryPath } from '../project-config.js'

export interface DocsCommandInput {
  registry?: string
  noGenericBlocks?: boolean
  out?: string
}

export async function docsCommand(input: DocsCommandInput, io: Io): Promise<number> {
  const loadedConfig = await loadContentbitConfig()
  const registry = await loadRegistry(registryPath(input.registry, loadedConfig), {
    includeGenericBlocks: !(input.noGenericBlocks || loadedConfig?.config.genericBlocks === false),
  })
  const guide = registry.toAuthoringGuide({ audience: 'human', includeExamples: true })
  if (input.out) await io.writeFile(input.out, guide)
  else io.stdout(guide)
  return 0
}
