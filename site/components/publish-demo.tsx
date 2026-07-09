import { ArrowRight, Check, FileCode2 } from 'lucide-react'

export function PublishDemo() {
  return (
    <div className="bg-card overflow-hidden border shadow-sm">
      <div className="grid lg:grid-cols-[1fr_3rem_1.1fr]">
        <div className="bg-muted/30 border-b p-5 lg:border-r lg:border-b-0">
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px]">
            <FileCode2 className="size-3.5" />
            content/article.md
          </div>
          <pre className="mt-5 overflow-x-auto font-mono text-xs leading-6">
            <code>
              <span className="text-foreground block">## Feature comparison</span>
              <span className="text-muted-foreground block"> </span>
              <span className="text-emerald-600 dark:text-emerald-400 block">
                {':::comparison{left="A" right="B"}'}
              </span>
              <span className="text-muted-foreground block">- Price | $9 | $12</span>
              <span className="text-emerald-600 dark:text-emerald-400 block">:::</span>
            </code>
          </pre>
        </div>

        <div className="bg-muted/30 hidden items-center justify-center border-r lg:flex">
          <ArrowRight className="text-muted-foreground size-4" />
        </div>

        <div className="p-5">
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            processed once, adapted anywhere
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ['React', '<ContentBlocks />'],
              ['Astro', '<ContentBlocks />'],
              ['Markdown', 'renderToMarkdown()'],
            ].map(([name, api]) => (
              <div key={name} className="border p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {name}
                </div>
                <code className="text-muted-foreground mt-3 block overflow-hidden text-ellipsis font-mono text-[10px] whitespace-nowrap">
                  {api}
                </code>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-5 max-w-xl text-sm leading-relaxed">
            Your content model stays portable. Renderers only decide how validated prose and blocks
            appear on each surface.
          </p>
        </div>
      </div>
    </div>
  )
}
