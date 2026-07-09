import { keyMetricsBlock } from '@contentbit/blocks'
import { defineBlockComponent } from '@contentbit/react'

import { cn } from '@/lib/utils'

// Static map so Tailwind can see the class names.
const COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

export const KeyMetricsBlock = defineBlockComponent(keyMetricsBlock, ({ node }) => {
  const data = node.data
  const cols = COLS[Math.min(data.rows.length, 4)]
  return (
    <div data-cb-styled className={cn('my-6 grid grid-cols-2 gap-3', cols)}>
      {data.rows.map((row, i) => (
        <div
          key={i}
          className="bg-card relative overflow-hidden rounded-lg border px-4 pt-4 pb-3.5"
        >
          <span
            className="via-foreground/20 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
            aria-hidden
          />
          <div className="text-2xl font-bold tracking-tight tabular-nums sm:text-[1.75rem]">
            {row.value}
          </div>
          <div className="text-muted-foreground mt-1 truncate font-mono text-[11px] tracking-wide uppercase">
            {row.label}
          </div>
        </div>
      ))}
    </div>
  )
})
