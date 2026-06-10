import { genericBlocks } from '@content-blocks/blocks'
import { createBlockRegistry, type BlockDefinition, type BlockRegistry } from '@content-blocks/core'
import { pathToFileURL } from 'node:url'

/** Generic pack + optional user module (default export: BlockDefinition[]). */
export async function loadRegistry(registryPath?: string): Promise<BlockRegistry> {
  const registry = createBlockRegistry().use(genericBlocks())
  if (registryPath) {
    const mod = (await import(pathToFileURL(registryPath).href)) as {
      default?: BlockDefinition<unknown>[]
    }
    if (!Array.isArray(mod.default)) {
      throw new Error(
        `--registry module must default-export an array of block definitions: ${registryPath}`,
      )
    }
    registry.use(mod.default)
  }
  return registry
}
