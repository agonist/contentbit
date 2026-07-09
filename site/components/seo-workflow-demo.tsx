import { ArrowRight, Check, FileText, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'

const CONTRACT = [
  ['pageTypes: {', 'text-muted-foreground'],
  ['  alternative: {', 'text-foreground'],
  ['    requiredSections: [', 'text-muted-foreground'],
  ["      'overview',", 'text-emerald-600 dark:text-emerald-400'],
  ["      'comparison',", 'text-emerald-600 dark:text-emerald-400'],
  ["      'faq',", 'text-emerald-600 dark:text-emerald-400'],
  ['    ],', 'text-muted-foreground'],
  ['    minOutgoingLinks: 3', 'text-foreground'],
  ['  }', 'text-muted-foreground'],
  ['}', 'text-muted-foreground'],
] as const

function WindowBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex h-10 items-center gap-1.5 border-b px-4 font-mono text-[11px]">
      <span className="size-1.5 rounded-full bg-red-400/80" />
      <span className="size-1.5 rounded-full bg-amber-400/80" />
      <span className="size-1.5 rounded-full bg-emerald-400/80" />
      <span className="ml-2 truncate">{children}</span>
    </div>
  )
}

export function SeoWorkflowDemo() {
  return (
    <div className="bg-card overflow-hidden border shadow-sm">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 font-mono text-[11px] sm:px-5">
        <span className="text-foreground font-medium">contentbit project</span>
        <span className="hidden text-border sm:inline">/</span>
        <span>4 page families</span>
        <span>128 planned pages</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-current" />
          contracts loaded
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_3rem_1fr_3rem_1fr]">
        <div className="min-w-0">
          <WindowBar>contentbit.seo.config.ts</WindowBar>
          <pre className="overflow-x-auto p-5 font-mono text-xs leading-6">
            <code>
              {CONTRACT.map(([line, className]) => (
                <span key={line} className={`block ${className}`}>
                  {line}
                </span>
              ))}
            </code>
          </pre>
          <div className="text-muted-foreground flex items-center gap-2 border-t px-5 py-3 font-mono text-[11px]">
            <FileText className="size-3.5" />
            one contract for every alternative page
          </div>
        </div>

        <div className="bg-muted/30 hidden items-center justify-center border-x lg:flex">
          <ArrowRight className="text-muted-foreground size-4" />
        </div>

        <div className="min-w-0 border-t lg:border-t-0">
          <WindowBar>contentbit brief semrush-alternatives</WindowBar>
          <div className="space-y-4 p-5 text-xs">
            <div>
              <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                target
              </p>
              <p className="mt-1.5 font-medium">Semrush alternatives</p>
              <p className="text-muted-foreground mt-0.5">commercial comparison · planned</p>
            </div>
            <div>
              <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                writing contract
              </p>
              <ul className="mt-2 space-y-1.5">
                {[
                  'Target “semrush alternatives”',
                  'Include comparison + FAQ',
                  'Link to seo-tools-comparison',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 border-t px-5 py-3 font-mono text-[11px]">
            <Sparkles className="size-3.5" />
            ready for an agent or writer
          </div>
        </div>

        <div className="bg-muted/30 hidden items-center justify-center border-x lg:flex">
          <ArrowRight className="text-muted-foreground size-4" />
        </div>

        <div className="min-w-0 border-t lg:border-t-0">
          <WindowBar>contentbit doctor --strict-seo</WindowBar>
          <div className="space-y-4 p-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-muted-foreground">semrush.md</span>
              <span className="text-emerald-600 dark:text-emerald-400">ready</span>
            </div>
            {[
              ['frontmatter', 'complete'],
              ['required sections', '3 / 3'],
              ['structured blocks', '2 / 2'],
              ['internal links', '4 resolved'],
            ].map(([label, result]) => (
              <div key={label} className="flex items-center gap-2">
                <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-muted-foreground">{label}</span>
                <span className="ml-auto text-right">{result}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t px-5 py-3 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-3.5" />0 errors · safe to publish
          </div>
        </div>
      </div>

      <div className="bg-muted/30 text-muted-foreground grid grid-cols-2 border-t font-mono text-[10px] tracking-wider uppercase sm:grid-cols-4">
        {[
          [FileText, 'plan'],
          [Sparkles, 'write'],
          [ShieldCheck, 'validate'],
          [GitBranch, 'publish'],
        ].map(([Icon, label], index) => (
          <div
            key={label as string}
            className={`flex items-center justify-center gap-2 px-4 py-3 ${index > 0 ? 'border-l' : ''} ${index > 1 ? 'border-t sm:border-t-0' : ''}`}
          >
            <Icon className="size-3.5" />
            {label as string}
          </div>
        ))}
      </div>
    </div>
  )
}
