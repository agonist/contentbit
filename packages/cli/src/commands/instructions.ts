import type { Io } from '../run.js'

import { loadRegistry } from '../content-project.js'
import { loadContentbitConfig, registryPath } from '../project-config.js'

export interface InstructionsCommandInput {
  audience?: string
  noExamples?: boolean
  registry?: string
  noGenericBlocks?: boolean
  out?: string
}

export async function instructionsCommand(
  input: InstructionsCommandInput,
  io: Io,
): Promise<number> {
  const loadedConfig = await loadContentbitConfig()
  const registry = await loadRegistry(registryPath(input.registry, loadedConfig), {
    includeGenericBlocks: !(input.noGenericBlocks || loadedConfig?.config.genericBlocks === false),
  })
  const guide = registry.toAuthoringGuide({
    audience: input.audience === 'human' ? 'human' : 'llm',
    includeExamples: !input.noExamples,
  })
  if (input.out) await io.writeFile(input.out, guide)
  else io.stdout(guide)
  return 0
}
