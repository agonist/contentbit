import type { BlockComponentProps } from '@content-blocks/react'

import { splitProsCons, type ProsConsData } from '@content-blocks/blocks'

export function ProsConsBlock({ node }: BlockComponentProps) {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  return (
    <div data-cb-styled className="my-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-emerald-500/40 p-4">
        <div className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Pros
        </div>
        <ul className="space-y-1.5 text-sm">
          {pros.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>✓</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-red-500/40 p-4">
        <div className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">Cons</div>
        <ul className="space-y-1.5 text-sm">
          {cons.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden>✗</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
