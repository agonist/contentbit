import { genericMarkdownRenderers } from '@contentbit/blocks'
import {
  type MarkdownBlockRenderer,
  parseDocument,
  renderToMarkdown,
  stripFrontmatter,
  validateDocument,
} from '@contentbit/core'
import { genericHtmlRenderers, renderToHtml, type HtmlBlockRenderer } from '@contentbit/html'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { formatDiagnosticForCli } from '../cli-format.js'
import { loadRegistry } from '../load-registry.js'

export async function renderCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      target: { type: 'string', default: 'html' },
      registry: { type: 'string' },
      'no-generic-blocks': { type: 'boolean', default: false },
      out: { type: 'string' },
    },
  })
  const file = positionals[0]
  if (!file || (values.target !== 'html' && values.target !== 'markdown')) {
    io.stderr(
      'render: usage: render <file> --target html|markdown ' +
        '[--registry <module.ts>] [--no-generic-blocks] [--out <file>]',
    )
    return 2
  }
  const includeGenericBlocks = !values['no-generic-blocks']
  const registry = await loadRegistry(values.registry, { includeGenericBlocks })
  const source = await readFile(file, 'utf8')
  const result = validateDocument(parseDocument(stripFrontmatter(source)), registry)
  if (!result.ok) {
    for (const d of result.diagnostics) io.stderr(formatDiagnosticForCli(d, file))
    return 1
  }
  const output =
    values.target === 'html'
      ? renderToHtml(result.document, {
          renderers: includeGenericBlocks ? undefined : genericHtmlFallbackRenderers,
        })
      : renderToMarkdown(result.document, {
          renderers: includeGenericBlocks
            ? genericMarkdownRenderers
            : genericMarkdownFallbackRenderers,
        })
  if (values.out) await io.writeFile(values.out, output)
  else io.stdout(output)
  return 0
}

const genericHtmlFallbackRenderers: Record<string, HtmlBlockRenderer> = Object.fromEntries(
  Object.keys(genericHtmlRenderers).map((name) => [
    name,
    ((node, ctx) => ctx.renderMarkdown(node.body)) satisfies HtmlBlockRenderer,
  ]),
)

const genericMarkdownFallbackRenderers: Record<string, MarkdownBlockRenderer> = Object.fromEntries(
  Object.keys(genericMarkdownRenderers).map((name) => [
    name,
    ((node) => `${node.body}\n`) satisfies MarkdownBlockRenderer,
  ]),
)
