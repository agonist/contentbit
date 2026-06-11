import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, type BlockDefinition, type BlockRegistry } from '@contentbit/core'
import { pathToFileURL } from 'node:url'

/** Generic pack + optional user module (default export: BlockDefinition[]). */
export async function loadRegistry(registryPath?: string): Promise<BlockRegistry> {
  const registry = createBlockRegistry().use(genericBlocks())
  if (registryPath) {
    let mod: { default?: BlockDefinition<unknown>[] }
    try {
      mod = (await import(pathToFileURL(registryPath).href)) as typeof mod
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
        throw new Error(
          `Importing a TypeScript registry needs Node 22.18+ (native type stripping): ${registryPath}`,
        )
      }
      throw err
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
