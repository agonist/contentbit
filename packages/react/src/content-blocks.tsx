'use client'

import type { ContentNode, DocumentNode, ValidatedBlockNode } from '@content-blocks/core'
import type { ComponentType, ReactNode } from 'react'

import { isValidatedBlock } from '@content-blocks/core'
import { Fragment } from 'react'

import { defaultComponents } from './components.js'

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
  document: DocumentNode
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
        return <Fallback key={i} name={node.name} body={node.body} />
      })
    },
  }
  return <>{ctx.renderNodes(props.document.children)}</>
}
