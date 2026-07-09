import { GITHUB_URL } from '@/lib/site'
import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
        <p>
          Open source and MIT licensed. Built by{' '}
          <Link
            href="https://x.com/agonist42"
            className="hover:text-foreground underline underline-offset-4"
          >
            @agonist42
          </Link>
          .
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/programmatic-seo" className="hover:text-foreground transition-colors">
            Programmatic SEO
          </Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <Link href="/blocks" className="hover:text-foreground transition-colors">
            Blocks
          </Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="/playground" className="hover:text-foreground transition-colors">
            Playground
          </Link>
          <Link href={GITHUB_URL} className="hover:text-foreground transition-colors">
            GitHub
          </Link>
        </nav>
      </div>
    </footer>
  )
}
