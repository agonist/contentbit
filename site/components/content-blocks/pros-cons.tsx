import type { BlockComponentProps } from '@contentbit/react'

import { splitProsCons, type ProsConsData } from '@contentbit/blocks'
import { Check, X } from 'lucide-react'

function Column({
  heading,
  items,
  tone,
}: {
  heading: string
  items: string[]
  tone: 'pro' | 'con'
}) {
  const Icon = tone === 'pro' ? Check : X
  const head =
    tone === 'pro'
      ? 'bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400'
      : 'bg-rose-500/[0.07] text-rose-700 dark:text-rose-400'
  const mark =
    tone === 'pro'
      ? 'text-emerald-600 dark:text-emerald-500'
      : 'text-rose-600 dark:text-rose-500'
  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${head}`}>
        <Icon className="size-3.5" aria-hidden strokeWidth={3} />
        <span className="text-xs font-semibold tracking-wider uppercase">{heading}</span>
      </div>
      <ul className="space-y-2 p-4 text-sm">
        {items.map((text, i) => (
          <li key={i} className="flex gap-2.5">
            <Icon className={`mt-1 size-3.5 shrink-0 ${mark}`} aria-hidden />
            <span className="leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProsConsBlock({ node }: BlockComponentProps) {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  return (
    <div data-cb-styled className="my-6 grid gap-3 sm:grid-cols-2">
      <Column heading="Pros" items={pros} tone="pro" />
      <Column heading="Cons" items={cons} tone="con" />
    </div>
  )
}
