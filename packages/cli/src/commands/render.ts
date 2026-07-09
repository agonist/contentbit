import { genericMarkdownRenderers } from '@contentbit/blocks'
import { compileDocument, type MarkdownBlockRenderer, renderToMarkdown } from '@contentbit/core'
import { readFile } from 'node:fs/promises'

import type { Io } from '../run.js'

import { formatDiagnosticForCli } from '../cli-format.js'
import { loadRegistry } from '../load-registry.js'
import { loadContentbitConfig } from '../project-config.js'

export interface RenderCommandInput {
  file?: string
  target?: string
  registry?: string
  noGenericBlocks?: boolean
  out?: string
}

export async function renderCommand(input: RenderCommandInput, io: Io): Promise<number> {
  if (!input.file || (input.target ?? 'markdown') !== 'markdown') {
    io.stderr(
      'render: usage: render <file> [--target markdown] ' +
        '[--registry <module.ts>] [--no-generic-blocks] [--out <file>]',
    )
    return 2
  }
  const loadedConfig = await loadContentbitConfig()
  const includeGenericBlocks = !(
    input.noGenericBlocks || loadedConfig?.config.genericBlocks === false
  )
  const registry = await loadRegistry(input.registry ?? loadedConfig?.config.registry, {
    cwd: loadedConfig?.cwd,
    includeGenericBlocks,
  })
  const source = await readFile(input.file, 'utf8')
  const result = compileDocument(source, registry)
  if (!result.ok) {
    for (const d of result.diagnostics) io.stderr(formatDiagnosticForCli(d, input.file))
    return 1
  }
  const output = renderToMarkdown(result.document, {
    renderers: includeGenericBlocks ? genericMarkdownRenderers : genericMarkdownFallbackRenderers,
  })
  if (input.out) await io.writeFile(input.out, output)
  else io.stdout(output)
  return 0
}

const genericMarkdownFallbackRenderers: Record<string, MarkdownBlockRenderer> = Object.fromEntries(
  Object.keys(genericMarkdownRenderers).map((name) => [
    name,
    ((node) => `${node.body}\n`) satisfies MarkdownBlockRenderer,
  ]),
)
