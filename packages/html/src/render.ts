import type { ContentNode, ValidatedBlockNode, ValidatedDocumentNode } from '@contentbit/core'

import {
  escapeHtml,
  fallbackMarkdown,
  invalidBlockHtml,
  unrenderableBlockError,
} from '@contentbit/blocks'
import { isValidatedBlock } from '@contentbit/core'

import { genericHtmlRenderers } from './blocks.js'

export {
  escapeHtml,
  fallbackMarkdown,
  invalidBlockHtml,
  unrenderableBlockError,
} from '@contentbit/blocks'

export interface HtmlRenderContext {
  cls(name: string): string
  escape(value: string): string
  renderMarkdown(md: string): string
  renderNodes(nodes: ContentNode[]): string
}

export type HtmlBlockRenderer = (
  node: ValidatedBlockNode<unknown>,
  ctx: HtmlRenderContext,
) => string

export interface RenderToHtmlOptions {
  /** Per-block renderers; merged over the generic defaults. */
  renderers?: Record<string, HtmlBlockRenderer>
  /** CSS class prefix. Default "cb-". */
  classPrefix?: string
  /** Host Markdown pipeline for prose segments. Default: escape + paragraphs (minimal). */
  renderMarkdown?: (md: string) => string
  /**
   * What to do with blocks that failed validation (spec: Error Handling):
   * strict = throw, annotated = visible dev box, fallback = escaped body. Default "fallback".
   */
  onInvalid?: 'strict' | 'annotated' | 'fallback'
}

export function renderToHtml(
  document: ValidatedDocumentNode,
  opts: RenderToHtmlOptions = {},
): string {
  const prefix = opts.classPrefix ?? 'cb-'
  const renderMarkdown = opts.renderMarkdown ?? fallbackMarkdown
  const renderers = { ...genericHtmlRenderers, ...opts.renderers }
  const onInvalid = opts.onInvalid ?? 'fallback'

  const ctx: HtmlRenderContext = {
    cls: (name) => `${prefix}${name}`,
    escape: escapeHtml,
    renderMarkdown,
    renderNodes(nodes) {
      return nodes
        .map((node) => {
          if (node.type === 'markdown') return renderMarkdown(node.value)
          const renderer = renderers[node.name]
          if (renderer && isValidatedBlock(node)) return renderer(node, ctx)
          if (onInvalid === 'strict') throw unrenderableBlockError(node.name)
          if (onInvalid === 'annotated') return invalidBlockHtml(node, prefix)
          return fallbackMarkdown(node.body)
        })
        .join('\n')
    },
  }
  return ctx.renderNodes(document.children)
}
