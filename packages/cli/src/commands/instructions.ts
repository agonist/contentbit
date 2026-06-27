import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

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
  const registry = await loadRegistry(input.registry, {
    includeGenericBlocks: !input.noGenericBlocks,
  })
  const guide = registry.toAuthoringGuide({
    audience: input.audience === 'human' ? 'human' : 'llm',
    includeExamples: !input.noExamples,
  })
  if (input.out) await io.writeFile(input.out, guide)
  else io.stdout(guide)
  return 0
}
