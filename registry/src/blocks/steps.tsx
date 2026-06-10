import type { StepsData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

export function StepsBlock({ node }: BlockComponentProps) {
  const data = node.data as StepsData
  return (
    <ol data-cb-styled className="my-6 space-y-3">
      {data.items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {i + 1}
          </span>
          <span className="text-sm leading-6">{item.text}</span>
        </li>
      ))}
    </ol>
  )
}
