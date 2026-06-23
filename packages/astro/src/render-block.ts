import type {
  CalloutData,
  ComparisonData,
  FaqData,
  FaqItemData,
  KeyMetricsData,
  ProsConsData,
  QuickRefData,
  StepsData,
  TabData,
  TabsData,
} from '@contentbit/blocks'
import type { ContentNode, ValidatedBlockNode } from '@contentbit/core'

import { splitProsCons } from '@contentbit/blocks'
import { isValidatedBlock } from '@contentbit/core'
import { escapeHtml } from '@contentbit/html'

export type MaybePromise<T> = T | Promise<T>
export type AstroMarkdownRenderer = (md: string) => MaybePromise<string>

export interface AstroBlockRenderContext {
  cls(name: string): string
  escape(value: string): string
  renderMarkdown: AstroMarkdownRenderer
  renderNodes(nodes: ContentNode[]): string
}

export type AstroBlockRenderer = (
  node: ValidatedBlockNode<unknown>,
  ctx: AstroBlockRenderContext,
) => MaybePromise<string>

export interface RenderBlockOptions {
  classPrefix: string
  renderMarkdown: AstroMarkdownRenderer
  renderers: Record<string, AstroBlockRenderer>
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
export async function renderBlockShell(
  node: ValidatedBlockNode<unknown>,
  opts: RenderBlockOptions,
): Promise<BlockShell | null> {
  const renderer = opts.renderers[node.name]
  if (!renderer) return null

  const slots: ContentNode[][] = []
  const html = await renderer(node, {
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

const callout: AstroBlockRenderer = async (node, ctx) => {
  const data = node.data as CalloutData
  const type = ctx.escape(String(node.props.type ?? 'note'))
  const title = node.props.title as string | undefined
  const titleHtml = title
    ? `<div class="${ctx.cls('callout-title')}">${ctx.escape(title)}</div>`
    : ''
  return `<aside class="${ctx.cls('callout')} ${ctx.cls(`callout-${type}`)}">${titleHtml}${await ctx.renderMarkdown(data.markdown)}</aside>`
}

const steps: AstroBlockRenderer = (node, ctx) => {
  const data = node.data as StepsData
  const items = data.items.map((i) => `<li>${ctx.escape(i.text)}</li>`).join('')
  return `<ol class="${ctx.cls('steps')}">${items}</ol>`
}

const keyMetrics: AstroBlockRenderer = (node, ctx) => {
  const data = node.data as KeyMetricsData
  const items = data.rows
    .map(
      (r) =>
        `<div class="${ctx.cls('key-metrics-item')}"><span class="${ctx.cls('key-metrics-value')}">${ctx.escape(r.value)}</span><span class="${ctx.cls('key-metrics-label')}">${ctx.escape(r.label)}</span></div>`,
    )
    .join('')
  return `<div class="${ctx.cls('key-metrics')}">${items}</div>`
}

const quickRef: AstroBlockRenderer = (node, ctx) => {
  const data = node.data as QuickRefData
  const rows = data.rows
    .map(
      (r) =>
        `<div class="${ctx.cls('quick-ref-row')}"><dt>${ctx.escape(r.key)}</dt><dd>${ctx.escape(r.value)}</dd></div>`,
    )
    .join('')
  return `<dl class="${ctx.cls('quick-ref')}">${rows}</dl>`
}

const comparison: AstroBlockRenderer = (node, ctx) => {
  const data = node.data as ComparisonData
  const head = `<thead><tr><th scope="col"></th><th scope="col">${ctx.escape(String(node.props.left))}</th><th scope="col">${ctx.escape(String(node.props.right))}</th></tr></thead>`
  const rows = data.rows
    .map(
      (r) =>
        `<tr><th scope="row">${ctx.escape(r.label)}</th><td>${ctx.escape(r.left)}</td><td>${ctx.escape(r.right)}</td></tr>`,
    )
    .join('')
  return `<table class="${ctx.cls('comparison')}">${head}<tbody>${rows}</tbody></table>`
}

const prosCons: AstroBlockRenderer = (node, ctx) => {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  const list = (cls: string, title: string, items: string[]) =>
    `<div class="${ctx.cls(cls)}"><div class="${ctx.cls('pros-cons-heading')}">${title}</div><ul>${items.map((i) => `<li>${ctx.escape(i)}</li>`).join('')}</ul></div>`
  return `<div class="${ctx.cls('pros-cons')}">${list('pros-cons-pros', 'Pros', pros)}${list('pros-cons-cons', 'Cons', cons)}</div>`
}

const tabs: AstroBlockRenderer = async (node, ctx) => {
  const data = node.data as TabsData
  const sections = await Promise.all(
    data.blocks.map(async (tab) => {
      const body = isValidatedBlock(tab) ? (tab.data as TabData).markdown : tab.body
      return `<section class="${ctx.cls('tab')}"><h3 class="${ctx.cls('tab-title')}">${ctx.escape(String(tab.props.title))}</h3>${await ctx.renderMarkdown(body)}</section>`
    }),
  )
  return `<div class="${ctx.cls('tabs')}">${sections.join('')}</div>`
}

const faq: AstroBlockRenderer = async (node, ctx) => {
  const data = node.data as FaqData
  const items = await Promise.all(
    data.blocks.map(async (item) => {
      const body = isValidatedBlock(item) ? (item.data as FaqItemData).markdown : item.body
      return `<details class="${ctx.cls('faq-item')}"><summary>${ctx.escape(String(item.props.question))}</summary>${await ctx.renderMarkdown(body)}</details>`
    }),
  )
  return `<div class="${ctx.cls('faq')}">${items.join('')}</div>`
}

export const genericAstroRenderers: Record<string, AstroBlockRenderer> = {
  callout,
  steps,
  'key-metrics': keyMetrics,
  'quick-ref': quickRef,
  comparison,
  'pros-cons': prosCons,
  tabs,
  faq,
}
