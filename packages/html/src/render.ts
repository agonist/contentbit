import type {
  BlockNode,
  ContentNode,
  ValidatedBlockNode,
  ValidatedDocumentNode,
} from '@contentbit/core'

import { isValidatedBlock } from '@contentbit/core'

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

/**
 * The minimal prose fallback shared by every renderer that has no Markdown
 * pipeline wired: escaped paragraphs, never raw HTML. Also used for
 * onInvalid: "fallback" block bodies.
 */
export function fallbackMarkdown(md: string): string {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n')
}

/** The onInvalid: "annotated" box. One definition so CSS contracts (.{prefix}invalid, data-cb-invalid) cannot drift between render targets. */
export function invalidBlockHtml(node: Pick<BlockNode, 'name' | 'body'>, prefix: string): string {
  return `<div class="${prefix}invalid" data-cb-invalid="${escapeHtml(node.name)}"><pre>${escapeHtml(node.body)}</pre></div>`
}

/** The onInvalid: "strict" error, shared verbatim across render targets. */
export function unrenderableBlockError(name: string): Error {
  return new Error(`Cannot render block "${name}": not validated or no renderer registered.`)
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
