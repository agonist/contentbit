import type { BlockComponent, BlockComponentProps } from '@contentbit/react'

// One React component per custom block, keyed by block name. Definitions
// live in ./registry.ts — add a block there, add its component here, and
// the rest of the app never changes.
function QuoteBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as { markdown: string }
  return (
    <figure className="my-6 border-s-2 ps-4">
      <blockquote className="text-lg italic">{ctx.renderMarkdown(data.markdown)}</blockquote>
      <figcaption className="text-muted-foreground mt-2 text-sm">
        — {String(node.props.author)}
        {node.props.role ? `, ${String(node.props.role)}` : null}
      </figcaption>
    </figure>
  )
}

export const blockComponents: Record<string, BlockComponent> = {
  quote: QuoteBlock,
}
