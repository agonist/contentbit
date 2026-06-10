'use client'

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
import { isValidatedBlock, type BlockNode } from '@contentbit/core'
import { useId, useState } from 'react'

import type { BlockComponent } from './content-blocks.js'

function childMarkdown(node: BlockNode): string {
  return isValidatedBlock(node) ? (node.data as TabData | FaqItemData).markdown : node.body
}

const Callout: BlockComponent = ({ node, ctx }) => {
  const data = node.data as CalloutData
  const type = String(node.props.type ?? 'note')
  const title = node.props.title as string | undefined
  return (
    <aside className={`cb-callout cb-callout-${type}`}>
      {title ? <div className="cb-callout-title">{title}</div> : null}
      {ctx.renderMarkdown(data.markdown)}
    </aside>
  )
}

const Steps: BlockComponent = ({ node }) => {
  const data = node.data as StepsData
  return (
    <ol className="cb-steps">
      {data.items.map((item, i) => (
        <li key={i}>{item.text}</li>
      ))}
    </ol>
  )
}

const KeyMetrics: BlockComponent = ({ node }) => {
  const data = node.data as KeyMetricsData
  return (
    <div className="cb-key-metrics">
      {data.rows.map((row, i) => (
        <div className="cb-key-metrics-item" key={i}>
          <span className="cb-key-metrics-value">{row.value}</span>
          <span className="cb-key-metrics-label">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

const QuickRef: BlockComponent = ({ node }) => {
  const data = node.data as QuickRefData
  return (
    <dl className="cb-quick-ref">
      {data.rows.map((row, i) => (
        <div className="cb-quick-ref-row" key={i}>
          <dt>{row.key}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const Comparison: BlockComponent = ({ node }) => {
  const data = node.data as ComparisonData
  return (
    <table className="cb-comparison">
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">{String(node.props.left)}</th>
          <th scope="col">{String(node.props.right)}</th>
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, i) => (
          <tr key={i}>
            <th scope="row">{row.label}</th>
            <td>{row.left}</td>
            <td>{row.right}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const ProsCons: BlockComponent = ({ node }) => {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  return (
    <div className="cb-pros-cons">
      <div className="cb-pros-cons-pros">
        <div className="cb-pros-cons-heading">Pros</div>
        <ul>
          {pros.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="cb-pros-cons-cons">
        <div className="cb-pros-cons-heading">Cons</div>
        <ul>
          {cons.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const Tabs: BlockComponent = ({ node, ctx }) => {
  const data = node.data as TabsData
  const [active, setActive] = useState(0)
  const safeActive = active < data.blocks.length ? active : 0
  const id = useId()
  return (
    <div className="cb-tabs">
      <div role="tablist" className="cb-tab-bar">
        {data.blocks.map((tab, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === safeActive}
            aria-controls={`${id}-panel-${i}`}
            className="cb-tab-button"
            onClick={() => setActive(i)}
          >
            {String(tab.props.title)}
          </button>
        ))}
      </div>
      {data.blocks.map((tab, i) =>
        i === safeActive ? (
          <div
            key={i}
            role="tabpanel"
            id={`${id}-panel-${i}`}
            aria-labelledby={`${id}-tab-${i}`}
            className="cb-tab-panel"
          >
            {ctx.renderMarkdown(childMarkdown(tab))}
          </div>
        ) : null,
      )}
    </div>
  )
}

const Faq: BlockComponent = ({ node, ctx }) => {
  const data = node.data as FaqData
  return (
    <div className="cb-faq">
      {data.blocks.map((item, i) => (
        <details className="cb-faq-item" key={i}>
          <summary>{String(item.props.question)}</summary>
          {ctx.renderMarkdown(childMarkdown(item))}
        </details>
      ))}
    </div>
  )
}

export const defaultComponents: Record<string, BlockComponent> = {
  callout: Callout,
  steps: Steps,
  'key-metrics': KeyMetrics,
  'quick-ref': QuickRef,
  comparison: Comparison,
  'pros-cons': ProsCons,
  tabs: Tabs,
  faq: Faq,
}
