import { stepsBlock } from '@contentbit/blocks'
import { defineBlockComponent } from '@contentbit/react'

export const StepsBlock = defineBlockComponent(stepsBlock, ({ node, ctx }) => {
  const data = node.data
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
          {/* Step text is Markdown — inline code and emphasis are common. */}
          <div className="min-w-0 pt-1 text-sm leading-relaxed [&>p]:m-0 [&>p+p]:mt-2">
            {ctx.renderMarkdown(item.text)}
          </div>
        </li>
      ))}
    </ol>
  )
})
