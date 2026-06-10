import { ThemeToggle } from '@/components/theme-toggle'
import { GITHUB_URL } from '@/lib/site'
import Link from 'next/link'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.05.78 2.13v3.16c0 .31.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  )
}

export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap"
        >
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center font-mono text-xs font-bold">
            :::
          </span>
          contentbit
        </Link>
        <nav className="text-muted-foreground flex items-center gap-5 text-sm">
          <Link href={"/docs"} className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <Link href="/blocks" className="hover:text-foreground hidden transition-colors sm:block">
            Blocks
          </Link>
          <Link
            href="/example"
            className="hover:text-foreground hidden transition-colors sm:block"
          >
            Example
          </Link>
          <Link href="/playground" className="hover:text-foreground transition-colors">
            Playground
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href={GITHUB_URL}
            aria-label="GitHub repository"
            className="hover:bg-accent hover:text-accent-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
          >
            <GitHubIcon className="size-4" />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
