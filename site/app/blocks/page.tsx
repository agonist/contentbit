import type { Metadata } from 'next'

import { BlockGallery } from '@/components/block-gallery'
import { SiteHeader } from '@/components/site-header'

import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blocks — the Content Blocks generic pack',
  description:
    'Every block in the generic pack: syntax, authoring guidance, and a live rendered example — straight from the registry that validates them.',
}

export default function BlocksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <header className="max-w-2xl pt-14 pb-10 sm:pt-20">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            The generic pack
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Eight blocks, one registry
          </h1>
          <p className="text-muted-foreground mt-4 text-pretty">
            Everything below — descriptions, guidance, examples — comes from the same registry
            that validates content and writes the LLM authoring instructions. The rendered panes
            are live: the styled pack rendering each block&apos;s real example.
          </p>
          <p className="text-muted-foreground mt-3 font-mono text-xs">
            machine-readable version:{' '}
            <Link
              href={"/docs/reference/blocks"}
              className="text-foreground underline underline-offset-4 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              generated block reference
            </Link>
          </p>
        </header>

        <BlockGallery />
      </main>
    </>
  )
}
