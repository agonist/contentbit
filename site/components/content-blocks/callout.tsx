import type { CalloutData } from '@contentbit/blocks'
import type { BlockComponentProps } from '@contentbit/react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Info, Lightbulb, OctagonAlert, Sparkles, TriangleAlert } from 'lucide-react'

interface Variant {
  border: string
  head: string
  icon: LucideIcon
  label: string
}

const VARIANTS: Record<string, Variant> = {
  note: {
    border: 'border-border',
    head: 'bg-muted/60 text-muted-foreground',
    icon: Info,
    label: 'Note',
  },
  tip: {
    border: 'border-emerald-500/30',
    head: 'bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400',
    icon: Lightbulb,
    label: 'Tip',
  },
  warning: {
    border: 'border-amber-500/30',
    head: 'bg-amber-500/[0.08] text-amber-700 dark:text-amber-400',
    icon: TriangleAlert,
    label: 'Warning',
  },
  important: {
    border: 'border-rose-500/30',
    head: 'bg-rose-500/[0.07] text-rose-700 dark:text-rose-400',
    icon: OctagonAlert,
    label: 'Important',
  },
  tldr: {
    border: 'border-sky-500/30',
    head: 'bg-sky-500/[0.07] text-sky-700 dark:text-sky-400',
    icon: Sparkles,
    label: 'TL;DR',
  },
}

export function CalloutBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as CalloutData
  const type = String(node.props.type ?? 'note')
  const title = node.props.title as string | undefined
  const variant = VARIANTS[type] ?? VARIANTS.note
  const Icon = variant.icon
  return (
    <aside data-cb-styled className={cn('bg-card my-6 border', variant.border)}>
      <div className={cn('flex items-center gap-2 border-b px-4 py-2', variant.head)}>
        <Icon className="size-3.5 shrink-0" aria-hidden strokeWidth={2.5} />
        <span className="font-mono text-[11px] font-semibold tracking-wider uppercase">
          {variant.label}
        </span>
        {title ? <span className="text-foreground ml-1 text-sm font-medium">{title}</span> : null}
      </div>
      <div className="px-4 py-3 text-sm leading-relaxed [&>p]:m-0 [&>p+p]:mt-2">
        {ctx.renderMarkdown(data.markdown)}
      </div>
    </aside>
  )
}
