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

import { splitProsCons } from '@contentbit/blocks'
import { isValidatedBlock } from '@contentbit/core'

import type { HtmlBlockRenderer } from './render.js'

const callout: HtmlBlockRenderer = (node, ctx) => {
  const data = node.data as CalloutData
  const type = ctx.escape(String(node.props.type ?? 'note'))
  const title = node.props.title as string | undefined
  const titleHtml = title
    ? `<div class="${ctx.cls('callout-title')}">${ctx.escape(title)}</div>`
    : ''
  return `<aside class="${ctx.cls('callout')} ${ctx.cls(`callout-${type}`)}">${titleHtml}${ctx.renderMarkdown(data.markdown)}</aside>`
}

const steps: HtmlBlockRenderer = (node, ctx) => {
  const data = node.data as StepsData
  const items = data.items.map((i) => `<li>${ctx.escape(i.text)}</li>`).join('')
  return `<ol class="${ctx.cls('steps')}">${items}</ol>`
}

const keyMetrics: HtmlBlockRenderer = (node, ctx) => {
  const data = node.data as KeyMetricsData
  const items = data.rows
    .map(
      (r) =>
        `<div class="${ctx.cls('key-metrics-item')}"><span class="${ctx.cls('key-metrics-value')}">${ctx.escape(r.value)}</span><span class="${ctx.cls('key-metrics-label')}">${ctx.escape(r.label)}</span></div>`,
    )
    .join('')
  return `<div class="${ctx.cls('key-metrics')}">${items}</div>`
}

const quickRef: HtmlBlockRenderer = (node, ctx) => {
  const data = node.data as QuickRefData
  const rows = data.rows
    .map(
      (r) =>
        `<div class="${ctx.cls('quick-ref-row')}"><dt>${ctx.escape(r.key)}</dt><dd>${ctx.escape(r.value)}</dd></div>`,
    )
    .join('')
  return `<dl class="${ctx.cls('quick-ref')}">${rows}</dl>`
}

const comparison: HtmlBlockRenderer = (node, ctx) => {
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

const prosCons: HtmlBlockRenderer = (node, ctx) => {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  const list = (cls: string, title: string, items: string[]) =>
    `<div class="${ctx.cls(cls)}"><div class="${ctx.cls('pros-cons-heading')}">${title}</div><ul>${items.map((i) => `<li>${ctx.escape(i)}</li>`).join('')}</ul></div>`
  return `<div class="${ctx.cls('pros-cons')}">${list('pros-cons-pros', 'Pros', pros)}${list('pros-cons-cons', 'Cons', cons)}</div>`
}

const tabs: HtmlBlockRenderer = (node, ctx) => {
  const data = node.data as TabsData
  const sections = data.blocks
    .map((tab) => {
      const body = isValidatedBlock(tab) ? (tab.data as TabData).markdown : tab.body
      return `<section class="${ctx.cls('tab')}"><h3 class="${ctx.cls('tab-title')}">${ctx.escape(String(tab.props.title))}</h3>${ctx.renderMarkdown(body)}</section>`
    })
    .join('')
  return `<div class="${ctx.cls('tabs')}">${sections}</div>`
}

const faq: HtmlBlockRenderer = (node, ctx) => {
  const data = node.data as FaqData
  const items = data.blocks
    .map((item) => {
      const body = isValidatedBlock(item) ? (item.data as FaqItemData).markdown : item.body
      return `<details class="${ctx.cls('faq-item')}"><summary>${ctx.escape(String(item.props.question))}</summary>${ctx.renderMarkdown(body)}</details>`
    })
    .join('')
  return `<div class="${ctx.cls('faq')}">${items}</div>`
}

export const genericHtmlRenderers: Record<string, HtmlBlockRenderer> = {
  callout,
  steps,
  'key-metrics': keyMetrics,
  'quick-ref': quickRef,
  comparison,
  'pros-cons': prosCons,
  tabs,
  faq,
}
