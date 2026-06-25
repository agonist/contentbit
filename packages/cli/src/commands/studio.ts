import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { formatRows, section } from '../cli-format.js'
import { resolveContentFiles } from '../content-project.js'
import { linkResolverOptions } from '../link-options.js'

export async function studioCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      port: { type: 'string' },
      host: { type: 'string' },
      'no-open': { type: 'boolean', default: false },
      'no-generic-blocks': { type: 'boolean', default: false },
      'min-section-words': { type: 'string' },
      'link-resolve': { type: 'string' },
      'locale-field': { type: 'string' },
      'slug-field': { type: 'string' },
      'key-field': { type: 'string' },
      'default-locale': { type: 'string' },
    },
  })

  const port = parsePort(values.port)
  if (port === null) {
    io.stderr('studio: --port must be an integer between 0 and 65535.')
    return 2
  }

  const minSectionWords = parseMinSectionWords(values['min-section-words'])
  if (minSectionWords === null) {
    io.stderr('studio: --min-section-words must be a non-negative integer.')
    return 2
  }

  // Guard empty/no-match the same way the read-commands do; startStudio does its
  // own globbing from `positionals`, so we only need the shared check here.
  await resolveContentFiles(positionals, 'studio')

  const { startStudio } =
    (await import('@contentbit/studio')) as typeof import('@contentbit/studio')
  const server = await startStudio({
    globs: positionals,
    registryPath: values.registry,
    includeGenericBlocks: !values['no-generic-blocks'],
    host: values.host,
    ...(port !== undefined ? { port } : {}),
    open: !values['no-open'],
    linkOptions: linkResolverOptions(values),
    minSectionWords,
  })

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
