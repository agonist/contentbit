import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

export interface DocsCommandInput {
  registry?: string
  noGenericBlocks?: boolean
  out?: string
}

export async function docsCommand(input: DocsCommandInput, io: Io): Promise<number> {
  const registry = await loadRegistry(input.registry, {
    includeGenericBlocks: !input.noGenericBlocks,
  })
  const guide = registry.toAuthoringGuide({ audience: 'human', includeExamples: true })
  if (input.out) await io.writeFile(input.out, guide)
  else io.stdout(guide)
  return 0
}
