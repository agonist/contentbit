'use client'

import posthog from 'posthog-js'
import Link from 'next/link'

export function BlogPostCta() {
  return (
    <div className="flex shrink-0 gap-3">
      <Link
        href="/playground"
        className="bg-primary text-primary-foreground inline-flex h-9 items-center px-4 text-sm font-medium shadow-sm transition-all hover:opacity-90 active:scale-95"
        onClick={() => posthog.capture('blog_post_cta_clicked', { cta: 'playground' })}
      >
        Open the playground
      </Link>
      <Link
        href="/docs"
        className="bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center border px-4 text-sm font-medium shadow-sm transition-all active:scale-95"
        onClick={() => posthog.capture('blog_post_cta_clicked', { cta: 'docs' })}
      >
        Read the docs
      </Link>
    </div>
  )
}
