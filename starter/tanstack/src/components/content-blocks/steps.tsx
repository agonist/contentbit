import type { StepsData } from '@contentbit/blocks'
import type { BlockComponentProps } from '@contentbit/react'

export function StepsBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as StepsData
  const last = data.items.length - 1
  return (
    <ol data-cb-styled className="my-6">
      {data.items.map((item, i) => (
        <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
          {i < last ? (
            <span className="absolute top-7 bottom-1 left-[13px] w-px bg-border" aria-hidden />
          ) : null}
          <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-xs font-semibold text-foreground shadow-sm">
            {i + 1}
          </span>
          {/* Step text is Markdown — inline code and emphasis are common. */}
          <div className="min-w-0 pt-1 text-sm leading-relaxed [&>p]:m-0 [&>p+p]:mt-2">
            {ctx.renderMarkdown(item.text)}
          </div>
        </li>
      ))}
    </ol>
  )
}
