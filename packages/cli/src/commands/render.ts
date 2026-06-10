import { genericMarkdownRenderers } from '@content-blocks/blocks'
import {
  formatDiagnostic,
  parseDocument,
  renderToMarkdown,
  validateDocument,
} from '@content-blocks/core'
import { renderToHtml } from '@content-blocks/html'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

export async function renderCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      target: { type: 'string', default: 'html' },
      registry: { type: 'string' },
      out: { type: 'string' },
    },
  })
  const file = positionals[0]
  if (!file || (values.target !== 'html' && values.target !== 'markdown')) {
    io.stderr('render: usage: render <file> --target html|markdown [--out <file>]')
    return 2
  }
  const registry = await loadRegistry(values.registry)
  const source = await readFile(file, 'utf8')
  const result = validateDocument(parseDocument(source), registry)
  if (!result.ok) {
    for (const d of result.diagnostics) io.stderr(formatDiagnostic(d, file))
    return 1
  }
  const output =
    values.target === 'html'
      ? renderToHtml(result.document)
      : renderToMarkdown(result.document, { renderers: genericMarkdownRenderers })
  if (values.out) await io.writeFile(values.out, output)
  else io.stdout(output)
  return 0
}
