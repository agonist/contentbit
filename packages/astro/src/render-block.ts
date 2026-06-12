import type { ContentNode, ValidatedBlockNode } from '@contentbit/core'
import type { HtmlBlockRenderer } from '@contentbit/html'

import { escapeHtml } from '@contentbit/html'

export interface RenderBlockOptions {
  classPrefix: string
  renderMarkdown: (md: string) => string
  renderers: Record<string, HtmlBlockRenderer>
}

export interface BlockShell {
  /** HTML fragments; childSlots[i] renders between parts[i] and parts[i + 1]. */
  parts: string[]
  /** Node groups handed back to Astro for recursive rendering, in output order. */
  childSlots: ContentNode[][]
}

// NUL is impossible in renderer output, so it cannot collide with real HTML.
const slotToken = (i: number) => `\u0000cb:${i}\u0000`
// oxlint-disable-next-line no-control-regex -- NUL is the one byte that cannot appear in renderer output
const SLOT_RE = /\u0000cb:(\d+)\u0000/g

/**
 * Render one validated block through its string renderer, capturing every
 * ctx.renderNodes() call as a placeholder so nested content can recurse
 * through Astro (where component overrides apply). Returns null when no
 * renderer is registered.
 */
export function renderBlockShell(
  node: ValidatedBlockNode<unknown>,
  opts: RenderBlockOptions,
): BlockShell | null {
  const renderer = opts.renderers[node.name]
  if (!renderer) return null

  const slots: ContentNode[][] = []
  const html = renderer(node, {
    cls: (name) => `${opts.classPrefix}${name}`,
    escape: escapeHtml,
    renderMarkdown: opts.renderMarkdown,
    renderNodes(nodes) {
      slots.push(nodes)
      return slotToken(slots.length - 1)
    },
  })

  const parts: string[] = []
  const childSlots: ContentNode[][] = []
  let last = 0
  for (const m of html.matchAll(SLOT_RE)) {
    const slot = slots[Number(m[1])]
    if (slot === undefined) continue // token-looking text in real content: leave it literal
    parts.push(html.slice(last, m.index))
    childSlots.push(slot)
    last = m.index + m[0].length
  }
  parts.push(html.slice(last))
  return { parts, childSlots }
}
