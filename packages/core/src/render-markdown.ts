import type { ContentNode } from './ast.js'

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
