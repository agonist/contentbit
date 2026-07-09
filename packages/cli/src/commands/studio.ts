import type { Io } from '../run.js'

import { formatRows, section } from '../cli-format.js'
import { resolveContentFiles } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'
import { discoverContentCommandDefaults } from '../script-defaults.js'

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
  const defaults = await discoverContentCommandDefaults('studio', input.globs)
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
  await resolveContentFiles(defaults.globs, 'studio', { cwd: defaults.cwd })
  const seoConfig = await loadSeoConfig({
    cwd: defaults.cwd,
    seoConfig: input.seoConfig ?? defaults.seoConfig,
    noSeo: input.noSeo ?? defaults.noSeo,
  })

  const { startStudio } =
    (await import('@contentbit/studio')) as typeof import('@contentbit/studio')
  const studioOptions = {
    globs: defaults.globs,
    cwd: defaults.cwd,
    registryPath: input.registry ?? defaults.registry,
    includeGenericBlocks: !(input.noGenericBlocks || defaults.noGenericBlocks),
    host: input.host,
    ...(port !== undefined ? { port } : {}),
    open: !input.noOpen,
    linkOptions: linkResolverOptions({
      linkResolve: input.linkResolve ?? defaults.linkResolve,
      localeField: input.localeField ?? defaults.localeField,
      slugField: input.slugField ?? defaults.slugField,
      keyField: input.keyField ?? defaults.keyField,
      defaultLocale: input.defaultLocale ?? defaults.defaultLocale,
    }),
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
