import type { StepsData } from '@contentbit/blocks'
import type { BlockComponentProps } from '@contentbit/react'

export function StepsBlock({ node }: BlockComponentProps) {
  const data = node.data as StepsData
  const last = data.items.length - 1
  return (
    <ol data-cb-styled className="my-6">
      {data.items.map((item, i) => (
        <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
          {i < last ? (
            <span className="bg-border absolute top-7 bottom-1 left-[13px] w-px" aria-hidden />
          ) : null}
          <span className="bg-card text-foreground z-10 flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold shadow-sm">
            {i + 1}
          </span>
          <span className="min-w-0 pt-1 text-sm leading-relaxed">{item.text}</span>
        </li>
      ))}
    </ol>
  )
}
