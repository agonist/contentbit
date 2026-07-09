import type { ContentNode } from './ast.js'
import type { BlockData, BlockDefinition, BlockName, BlockPropsOf } from './registry.js'

import {
  isValidatedBlock,
  type ValidatedBlockNode,
  type ValidatedDocumentNode,
} from './validate.js'

export interface MarkdownRenderContext {
  renderNodes(nodes: ContentNode[]): string
}

export type MarkdownBlockRenderer = (
  node: ValidatedBlockNode<unknown>,
  ctx: MarkdownRenderContext,
) => string

export type MarkdownBlockRendererFor<TDefinition extends BlockDefinition> = (
  node: ValidatedBlockNode<
    BlockData<TDefinition>,
    BlockPropsOf<TDefinition>,
    BlockName<TDefinition>
  >,
  ctx: MarkdownRenderContext,
) => string

export type MarkdownRenderersFor<TDefinitions extends ReadonlyArray<BlockDefinition>> = {
  [TDefinition in TDefinitions[number] as BlockName<TDefinition>]?: MarkdownBlockRendererFor<TDefinition>
}

export function defineMarkdownBlockRenderer<TDefinition extends BlockDefinition>(
  _definition: TDefinition,
  renderer: MarkdownBlockRendererFor<TDefinition>,
): MarkdownBlockRendererFor<TDefinition> {
  return renderer
}

export function defineMarkdownRenderers<const TDefinitions extends ReadonlyArray<BlockDefinition>>(
  _definitions: TDefinitions,
  renderers: MarkdownRenderersFor<TDefinitions>,
): Record<string, MarkdownBlockRenderer> {
  return renderers as unknown as Record<string, MarkdownBlockRenderer>
}

export interface RenderToMarkdownOptions {
  renderers?: Record<string, MarkdownBlockRenderer>
}

/**
 * Plain-Markdown fallback: preserves prose verbatim, converts blocks via the
 * supplied renderers, and degrades unrenderable blocks to their raw body so
 * no information is lost (spec: Markdown fallback renderer).
 */
export function renderToMarkdown(
  document: ValidatedDocumentNode,
  opts: RenderToMarkdownOptions = {},
): string {
  const ctx: MarkdownRenderContext = {
    renderNodes(nodes) {
      return nodes
        .map((node) => {
          if (node.type === 'markdown') return node.value.trim()
          const renderer = opts.renderers?.[node.name]
          if (renderer && isValidatedBlock(node)) return renderer(node, ctx).trim()
          return node.body.trim()
        })
        .filter((s) => s !== '')
        .join('\n\n')
    },
  }
  return ctx.renderNodes(document.children) + '\n'
}
