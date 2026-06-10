import type { CalloutData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

import { cn } from '@/lib/utils'

const VARIANTS: Record<string, string> = {
  note: 'border-border bg-muted/50',
  tip: 'border-emerald-500/60 bg-emerald-500/5',
  warning: 'border-amber-500/60 bg-amber-500/5',
  important: 'border-red-500/60 bg-red-500/5',
  tldr: 'border-primary/60 bg-primary/5',
}

export function CalloutBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as CalloutData
  const type = String(node.props.type ?? 'note')
  const title = node.props.title as string | undefined
  return (
    <aside
      data-cb-styled
      className={cn('my-6 rounded-r-lg border-l-4 p-4', VARIANTS[type] ?? VARIANTS.note)}
    >
      {title ? <div className="mb-1 text-sm font-semibold">{title}</div> : null}
      <div className="text-sm leading-relaxed [&>p]:m-0">{ctx.renderMarkdown(data.markdown)}</div>
    </aside>
  )
}
