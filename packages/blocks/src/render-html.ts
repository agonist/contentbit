import type { BlockNode, ContentNode, ValidatedBlockNode } from '@contentbit/core'

import { isValidatedBlock } from '@contentbit/core'

import type { CalloutData } from './blocks/callout.js'
import type { ComparisonData } from './blocks/comparison.js'
import type { FaqData, FaqItemData } from './blocks/faq.js'
import type { KeyMetricsData } from './blocks/key-metrics.js'
import type { ProsConsData } from './blocks/pros-cons.js'
import type { QuickRefData } from './blocks/quick-ref.js'
import type { StepsData } from './blocks/steps.js'
import type { TabData, TabsData } from './blocks/tabs.js'

import { splitProsCons } from './blocks/pros-cons.js'

export type MaybePromise<T> = T | PromiseLike<T>

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Minimal prose fallback for hosts that do not wire a Markdown pipeline:
 * escaped paragraphs, never raw HTML.
 */
export function fallbackMarkdown(md: string): string {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n')
}

export function invalidBlockHtml(node: Pick<BlockNode, 'name' | 'body'>, prefix: string): string {
  return `<div class="${prefix}invalid" data-cb-invalid="${escapeHtml(node.name)}"><pre>${escapeHtml(node.body)}</pre></div>`
}

export function unrenderableBlockError(name: string): Error {
  return new Error(`Cannot render block "${name}": not validated or no renderer registered.`)
}

export interface GenericHtmlStringRenderContext {
  cls(name: string): string
  escape(value: string): string
  renderMarkdown(md: string): MaybePromise<string>
  renderNodes(nodes: ContentNode[]): string
}

export type GenericHtmlStringBlockRenderer = (
  node: ValidatedBlockNode<unknown>,
  ctx: GenericHtmlStringRenderContext,
) => MaybePromise<string>

export function isPromiseLike<T>(value: MaybePromise<T>): value is PromiseLike<T> {
  return typeof (value as { then?: unknown }).then === 'function'
}

function mapMaybe<T, U>(value: MaybePromise<T>, fn: (value: T) => U): MaybePromise<U> {
  return isPromiseLike(value) ? value.then(fn) : fn(value)
}

function joinMaybe(parts: MaybePromise<string>[]): MaybePromise<string> {
  return parts.some((part) => isPromiseLike(part))
    ? Promise.all(parts).then((resolved) => resolved.join(''))
    : (parts as string[]).join('')
}

const callout: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const data = node.data as CalloutData
  const type = ctx.escape(String(node.props.type ?? 'note'))
  const title = node.props.title as string | undefined
  const titleHtml = title
    ? `<div class="${ctx.cls('callout-title')}">${ctx.escape(title)}</div>`
    : ''
  return mapMaybe(
    ctx.renderMarkdown(data.markdown),
    (body) =>
      `<aside class="${ctx.cls('callout')} ${ctx.cls(`callout-${type}`)}">${titleHtml}${body}</aside>`,
  )
}

const steps: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const data = node.data as StepsData
  const items = data.items.map((i) => `<li>${ctx.escape(i.text)}</li>`).join('')
  return `<ol class="${ctx.cls('steps')}">${items}</ol>`
}

const keyMetrics: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const data = node.data as KeyMetricsData
  const items = data.rows
    .map(
      (r) =>
        `<div class="${ctx.cls('key-metrics-item')}"><span class="${ctx.cls('key-metrics-value')}">${ctx.escape(r.value)}</span><span class="${ctx.cls('key-metrics-label')}">${ctx.escape(r.label)}</span></div>`,
    )
    .join('')
  return `<div class="${ctx.cls('key-metrics')}">${items}</div>`
}

const quickRef: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const data = node.data as QuickRefData
  const rows = data.rows
    .map(
      (r) =>
        `<div class="${ctx.cls('quick-ref-row')}"><dt>${ctx.escape(r.key)}</dt><dd>${ctx.escape(r.value)}</dd></div>`,
    )
    .join('')
  return `<dl class="${ctx.cls('quick-ref')}">${rows}</dl>`
}

const comparison: GenericHtmlStringBlockRenderer = (node, ctx) => {
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

const prosCons: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  const list = (cls: string, title: string, items: string[]) =>
    `<div class="${ctx.cls(cls)}"><div class="${ctx.cls('pros-cons-heading')}">${title}</div><ul>${items.map((i) => `<li>${ctx.escape(i)}</li>`).join('')}</ul></div>`
  return `<div class="${ctx.cls('pros-cons')}">${list('pros-cons-pros', 'Pros', pros)}${list('pros-cons-cons', 'Cons', cons)}</div>`
}

const tabs: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const data = node.data as TabsData
  const sections = joinMaybe(
    data.blocks.map((tab) => {
      const body = isValidatedBlock(tab) ? (tab.data as TabData).markdown : tab.body
      return mapMaybe(
        ctx.renderMarkdown(body),
        (bodyHtml) =>
          `<section class="${ctx.cls('tab')}"><h3 class="${ctx.cls('tab-title')}">${ctx.escape(String(tab.props.title))}</h3>${bodyHtml}</section>`,
      )
    }),
  )
  return mapMaybe(sections, (html) => `<div class="${ctx.cls('tabs')}">${html}</div>`)
}

const faq: GenericHtmlStringBlockRenderer = (node, ctx) => {
  const data = node.data as FaqData
  const items = joinMaybe(
    data.blocks.map((item) => {
      const body = isValidatedBlock(item) ? (item.data as FaqItemData).markdown : item.body
      return mapMaybe(
        ctx.renderMarkdown(body),
        (bodyHtml) =>
          `<details class="${ctx.cls('faq-item')}"><summary>${ctx.escape(String(item.props.question))}</summary>${bodyHtml}</details>`,
      )
    }),
  )
  return mapMaybe(items, (html) => `<div class="${ctx.cls('faq')}">${html}</div>`)
}

export const genericHtmlStringRenderers: Record<string, GenericHtmlStringBlockRenderer> = {
  callout,
  steps,
  'key-metrics': keyMetrics,
  'quick-ref': quickRef,
  comparison,
  'pros-cons': prosCons,
  tabs,
  faq,
}
