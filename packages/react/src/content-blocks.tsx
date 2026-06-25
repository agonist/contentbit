'use client'

import type { ContentNode, ValidatedBlockNode, ValidatedDocumentNode } from '@contentbit/core'
import type { ComponentType, ReactNode } from 'react'

import { isValidatedBlock } from '@contentbit/core'
import { Fragment } from 'react'

import { defaultComponents } from './components.js'

// Bundlers statically replace process.env.NODE_ENV; this keeps tsc happy
// without pulling Node types into a browser-facing package.
declare const process: { env: { NODE_ENV?: string } }

// Warn once per block name in development when a valid block has no component.
const warned = new Set<string>()
function warnMissingComponent(name: string): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV === 'production' || warned.has(name))
    return
  warned.add(name)
  console.warn(
    `[contentbit] no component registered for block "${name}" — rendering the raw-body fallback. ` +
      'Pass it via the `components` prop.',
  )
}

export interface BlockRenderContext {
  renderMarkdown(md: string): ReactNode
  renderNodes(nodes: ContentNode[]): ReactNode
}

export interface BlockComponentProps<TData = unknown> {
  node: ValidatedBlockNode<TData>
  ctx: BlockRenderContext
}

export type BlockComponent = ComponentType<BlockComponentProps>

export interface ContentBlocksProps {
  document: ValidatedDocumentNode
  /** Per-block components; merged over the headless defaults. */
  components?: Record<string, BlockComponent>
  /** Host markdown renderer for prose segments. Default: paragraphs of plain text. */
  renderMarkdown?: (md: string) => ReactNode
  /** Rendered for blocks that failed validation. Default: escaped body paragraphs. */
  fallback?: ComponentType<{ name: string; body: string }>
}

function DefaultMarkdown({ md }: { md: string }): ReactNode {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((p, i) => <p key={i}>{p}</p>)
}

function DefaultFallback({ body }: { name: string; body: string }): ReactNode {
  return <DefaultMarkdown md={body} />
}

export function ContentBlocks(props: ContentBlocksProps): ReactNode {
  const components = { ...defaultComponents, ...props.components }
  const renderMarkdown = props.renderMarkdown ?? ((md: string) => <DefaultMarkdown md={md} />)
  const Fallback = props.fallback ?? DefaultFallback

  const ctx: BlockRenderContext = {
    renderMarkdown,
    renderNodes(nodes) {
      return nodes.map((node, i) => {
        if (node.type === 'markdown')
          return <Fragment key={i}>{renderMarkdown(node.value)}</Fragment>
        const Component = components[node.name]
        if (Component && isValidatedBlock(node)) {
          return <Component key={i} node={node} ctx={ctx} />
        }
        if (!Component && isValidatedBlock(node)) warnMissingComponent(node.name)
        return <Fallback key={i} name={node.name} body={node.body} />
      })
    },
  }
  return <>{ctx.renderNodes(props.document.children)}</>
}
