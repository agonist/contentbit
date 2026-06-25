import type { Io } from '../run.js'

import { formatRows, section } from '../cli-format.js'
import { resolveContentFiles } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'

export interface StudioCommandInput extends LinkOptionValues {
  globs: string[]
  registry?: string
  port?: string
  host?: string
  noOpen?: boolean
  noGenericBlocks?: boolean
  minSectionWords?: string
  seoConfig?: string
  noSeo?: boolean
}

export async function studioCommand(input: StudioCommandInput, io: Io): Promise<number> {
  const port = parsePort(input.port)
  if (port === null) {
    io.stderr('studio: --port must be an integer between 0 and 65535.')
    return 2
  }

  const minSectionWords = parseMinSectionWords(input.minSectionWords)
  if (minSectionWords === null) {
    io.stderr('studio: --min-section-words must be a non-negative integer.')
    return 2
  }

  // Guard empty/no-match the same way the read-commands do; startStudio does its
  // own globbing from `positionals`, so we only need the shared check here.
  await resolveContentFiles(input.globs, 'studio')
  const seoConfig = await loadSeoConfig({ seoConfig: input.seoConfig, noSeo: input.noSeo })

  const { startStudio } =
    (await import('@contentbit/studio')) as typeof import('@contentbit/studio')
  const studioOptions = {
    globs: input.globs,
    registryPath: input.registry,
    includeGenericBlocks: !input.noGenericBlocks,
    host: input.host,
    ...(port !== undefined ? { port } : {}),
    open: !input.noOpen,
    linkOptions: linkResolverOptions(input),
    minSectionWords,
    seoConfig: seoConfig.config,
    seoConfigPath: seoConfig.path,
  }
  const server = await startStudio(studioOptions)

  io.stdout(
    [
      section('contentbit studio'),
      ...formatRows([
        { label: 'URL', value: server.url, tone: 'info' },
        { label: 'Stop', value: 'Ctrl+C' },
      ]),
    ].join('\n'),
  )

  const close = () => {
    void server.close()
  }
  process.once('SIGINT', close)
  process.once('SIGTERM', close)
  await server.closed
  process.off('SIGINT', close)
  process.off('SIGTERM', close)
  return 0
}

function parsePort(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined
  if (!/^\d+$/.test(value)) return null
  const port = Number(value)
  return port >= 0 && port <= 65535 ? port : null
}

function parseMinSectionWords(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}
