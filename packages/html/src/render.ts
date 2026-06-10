import type { ContentNode, DocumentNode, ValidatedBlockNode } from '@content-blocks/core'

import { isValidatedBlock } from '@content-blocks/core'

import { genericHtmlRenderers } from './blocks.js'
import { escapeHtml } from './escape.js'

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

function defaultMarkdown(md: string): string {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n')
}

export function renderToHtml(document: DocumentNode, opts: RenderToHtmlOptions = {}): string {
  const prefix = opts.classPrefix ?? 'cb-'
  const renderMarkdown = opts.renderMarkdown ?? defaultMarkdown
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
          if (onInvalid === 'strict') {
            throw new Error(
              `Cannot render block "${node.name}": not validated or no renderer registered.`,
            )
          }
          if (onInvalid === 'annotated') {
            return `<div class="${prefix}invalid" data-cb-invalid="${escapeHtml(node.name)}"><pre>${escapeHtml(node.body)}</pre></div>`
          }
          return defaultMarkdown(node.body)
        })
        .join('\n')
    },
  }
  return ctx.renderNodes(document.children)
}
