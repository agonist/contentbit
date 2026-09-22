import type { Io } from '../run.js'

import { resolveContentCommandConfig } from '../command-config.js'
import { resolve as resolveImport } from 'import-meta-resolve'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { formatRows, section } from '../cli-format.js'
import { resolveContentFiles } from '../content-project.js'
import type { LinkOptionValues } from '../link-options.js'

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
  const config = await resolveContentCommandConfig('studio', input)
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
  await resolveContentFiles(config.globs, 'studio', { cwd: config.cwd })
  const seoConfig = await config.loadSeo()

  let studioUrl: string | undefined
  try {
    studioUrl = resolveImport(
      '@contentbit/studio',
      pathToFileURL(join(config.cwd ?? process.cwd(), 'package.json')).href,
    )
  } catch (error) {
    if (!isMissingStudio(error)) throw error
  }

  let startStudio: (typeof import('@contentbit/studio'))['startStudio']
  try {
    ;({ startStudio } = (await (studioUrl
      ? import(studioUrl)
      : import('@contentbit/studio'))) as typeof import('@contentbit/studio'))
  } catch (error) {
    if (!studioUrl && isMissingStudio(error)) {
      throw new Error(
        'Studio is installed separately to keep the base CLI lightweight. ' +
          'Install it with your package manager, for example: pnpm add -D @contentbit/studio',
      )
    }
    throw error
  }
  const studioOptions = {
    globs: config.globs,
    cwd: config.cwd,
    registryPath: config.registry,
    includeGenericBlocks: config.includeGenericBlocks,
    host: input.host,
    ...(port !== undefined ? { port } : {}),
    open: !input.noOpen,
    linkOptions: config.resolveLinkOptions(),
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

function isMissingStudio(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.message.includes('@contentbit/studio')
  )
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
