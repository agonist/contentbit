import type { CalloutData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Info, Lightbulb, OctagonAlert, Sparkles, TriangleAlert } from 'lucide-react'

interface Variant {
  container: string
  icon: LucideIcon
  iconClass: string
  label: string
}

const VARIANTS: Record<string, Variant> = {
  note: {
    container: 'border-l-foreground/30 bg-muted/40',
    icon: Info,
    iconClass: 'text-muted-foreground',
    label: 'Note',
  },
  tip: {
    container: 'border-l-emerald-500 bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]',
    icon: Lightbulb,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    label: 'Tip',
  },
  warning: {
    container: 'border-l-amber-500 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]',
    icon: TriangleAlert,
    iconClass: 'text-amber-600 dark:text-amber-400',
    label: 'Warning',
  },
  important: {
    container: 'border-l-rose-500 bg-rose-500/[0.05] dark:bg-rose-500/[0.08]',
    icon: OctagonAlert,
    iconClass: 'text-rose-600 dark:text-rose-400',
    label: 'Important',
  },
  tldr: {
    container: 'border-l-sky-500 bg-sky-500/[0.05] dark:bg-sky-500/[0.08]',
    icon: Sparkles,
    iconClass: 'text-sky-600 dark:text-sky-400',
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
    <aside
      data-cb-styled
      className={cn('my-6 flex gap-3 rounded-lg border border-l-4 px-4 py-3.5', variant.container)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', variant.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-sm leading-5 font-semibold">{title ?? variant.label}</div>
        <div className="text-sm leading-relaxed [&>p]:m-0 [&>p+p]:mt-2">
          {ctx.renderMarkdown(data.markdown)}
        </div>
      </div>
    </aside>
  )
}
