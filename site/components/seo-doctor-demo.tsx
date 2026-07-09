import { Check, CircleAlert, Link2, ShieldCheck } from 'lucide-react'

export function SeoDoctorDemo() {
  return (
    <div className="bg-card overflow-hidden border shadow-sm">
      <div className="text-muted-foreground flex h-10 items-center gap-1.5 border-b px-4 font-mono text-[11px]">
        <span className="size-1.5 rounded-full bg-red-400/80" />
        <span className="size-1.5 rounded-full bg-amber-400/80" />
        <span className="size-1.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2">$ contentbit doctor --strict-seo</span>
        <span className="text-destructive ml-auto">exit 1</span>
      </div>
      <div className="grid md:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4 p-5 font-mono text-xs md:border-r">
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <CircleAlert className="size-3.5" />
              <span>CB_SEO_SECTION_MISSING</span>
            </div>
            <p className="text-muted-foreground mt-1.5 pl-5.5">
              alternatives/notion.md is missing “Feature comparison”
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Link2 className="size-3.5" />
              <span>CB_SEO_LINK_REQUIRED</span>
            </div>
            <p className="text-muted-foreground mt-1.5 pl-5.5">
              expected a link to seo-tools-comparison
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="text-muted-foreground">repair plan</p>
            <p className="mt-1.5">2 required fixes · 1 suggestion</p>
          </div>
        </div>
        <div className="bg-muted/30 space-y-4 p-5">
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            the same gate checks
          </p>
          <ul className="space-y-2.5 text-sm">
            {[
              'Page-family requirements',
              'Block schemas',
              'Link targets and backlinks',
              'Thin sections and image alt text',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
          <div className="text-muted-foreground flex items-center gap-2 border-t pt-4 font-mono text-[11px]">
            <ShieldCheck className="size-3.5" />
            local · agent loop · CI
          </div>
        </div>
      </div>
    </div>
  )
}
