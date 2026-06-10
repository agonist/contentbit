import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

export async function instructionsCommand(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      audience: { type: 'string', default: 'llm' },
      'no-examples': { type: 'boolean', default: false },
      registry: { type: 'string' },
      out: { type: 'string' },
    },
  })
  const registry = await loadRegistry(values.registry)
  const guide = registry.toAuthoringGuide({
    audience: values.audience === 'human' ? 'human' : 'llm',
    includeExamples: !values['no-examples'],
  })
  if (values.out) await io.writeFile(values.out, guide)
  else io.stdout(guide)
  return 0
}
