import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

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

  if (positionals.length === 0) {
    io.stderr('studio: provide at least one file or glob.')
    return 2
  }

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

  const files = await glob(positionals, { absolute: true })
  if (files.length === 0) {
    io.stderr(`studio: no files matched ${positionals.join(' ')}`)
    return 2
  }

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

  io.stdout(`contentbit studio running at ${server.url}`)
  io.stdout('Press Ctrl+C to stop.')

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
