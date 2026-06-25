import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

export async function docsCommand(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      registry: { type: 'string' },
      'no-generic-blocks': { type: 'boolean', default: false },
      out: { type: 'string' },
    },
  })
  const registry = await loadRegistry(values.registry, {
    includeGenericBlocks: !values['no-generic-blocks'],
  })
  const guide = registry.toAuthoringGuide({ audience: 'human', includeExamples: true })
  if (values.out) await io.writeFile(values.out, guide)
  else io.stdout(guide)
  return 0
}
