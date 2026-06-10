import type { Metadata } from 'next'

import { ExampleArticle } from '@/components/example-article'
import { SiteHeader } from '@/components/site-header'
import { EXAMPLE_DESCRIPTION, EXAMPLE_TITLE } from '@/lib/example-article'

import Link from 'next/link'

export const metadata: Metadata = {
  title: `${EXAMPLE_TITLE} — a complete Content Blocks article`,
  description: EXAMPLE_DESCRIPTION,
}

export default function ExamplePage() {
  return (
    <>
      <SiteHeader />
      <main className="pb-20">
        <header className="mx-auto max-w-2xl px-6 pt-14 pb-8 sm:pt-20">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            A complete article
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {EXAMPLE_TITLE}
          </h1>
          <p className="text-muted-foreground mt-4 text-pretty">
            {EXAMPLE_DESCRIPTION} Flip between the three targets below — same file, no
            rewrites.
          </p>
        </header>

        <ExampleArticle />

        {/* Closing CTA */}
        <aside className="mx-auto mt-4 max-w-2xl px-6">
          <div className="bg-card flex flex-col items-start justify-between gap-4 rounded-xl border p-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold">Write one yourself</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                The playground validates as you type — same parser, same registry.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link
                href="/playground"
                className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-md px-4 text-sm font-medium shadow-sm transition-all hover:opacity-90 active:scale-95"
              >
                Open the playground
              </Link>
              <Link
                href={"/docs"}
                className="bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium shadow-sm transition-all active:scale-95"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </aside>
      </main>
    </>
  )
}
