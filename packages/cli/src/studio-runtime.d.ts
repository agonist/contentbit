declare module '@contentbit/studio' {
  import type { LinkResolverOptions } from '@contentbit/core'

  export interface StartStudioOptions {
    globs: string[]
    registryPath?: string
    includeGenericBlocks?: boolean
    cwd?: string
    host?: string
    port?: number
    open?: boolean
    linkOptions?: LinkResolverOptions
    minSectionWords?: number
  }

  export interface StudioServer {
    url: string
    close(): Promise<void>
    closed: Promise<void>
  }

  export function startStudio(options: StartStudioOptions): Promise<StudioServer>
}
