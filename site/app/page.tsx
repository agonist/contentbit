import { BlockShowcase } from '@/components/block-showcase'
import { CopyButton } from '@/components/copy-button'
import { FeatureBento } from '@/components/feature-bento'
import { Frame } from '@/components/frame'
import { HeroGlyphs } from '@/components/hero-glyphs'
import { HomeDemo } from '@/components/home-demo'
import { SiteHeader } from '@/components/site-header'
import { ValidationDemo } from '@/components/validation-demo'
import { GITHUB_URL } from '@/lib/site'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import Link from 'next/link'

const INSTALL = 'pnpm add @contentbit/core @contentbit/blocks'
const SHADCN_ADD = 'pnpm dlx shadcn@latest add @contentbit/generic-pack'

function Eyebrow({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
      <span className="text-emerald-600 dark:text-emerald-400">{index}</span>
      <span className="mx-2 select-none">·</span>
      {children}
    </p>
  )
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <HeroGlyphs />
          <div className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center sm:pt-28">
            <div className="animate-rise" style={{ animationDelay: '0ms' }}>
              <Link
                href={"/docs/concepts/llm-authoring"}
                className="bg-background/60 text-muted-foreground hover:text-foreground inline-flex items-center gap-2 border px-3 py-1 font-mono text-xs backdrop-blur transition-colors"
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Built for LLM-generated content
              </Link>
            </div>
            <h1
              className="animate-rise mt-6 text-[2.75rem] leading-[1.05] font-semibold tracking-tighter text-balance sm:text-[4rem]"
              style={{ animationDelay: '80ms' }}
            >
              Structured Markdown components
              <span className="text-muted-foreground"> without framework lock-in</span>
            </h1>
            <p
              className="text-muted-foreground animate-rise mx-auto mt-6 max-w-xl text-base text-pretty sm:text-lg"
              style={{ animationDelay: '160ms' }}
            >
              Write Markdown with validated, structured blocks. Render it anywhere. Built for
              content written by humans, CMSes, and LLMs.
            </p>
            <div
              className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href={"/docs"}
                className="bg-primary text-primary-foreground inline-flex h-10 items-center rounded-md px-5 text-sm font-medium shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-95"
              >
                Get started
              </Link>
              <Link
                href="/playground"
                className="bg-background/80 hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center rounded-md border px-5 text-sm font-medium shadow-sm backdrop-blur transition-all active:scale-95"
              >
                Open the playground
              </Link>
            </div>
            <div
              className="animate-rise bg-card mx-auto mt-9 flex max-w-md items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-4 shadow-sm"
              style={{ animationDelay: '320ms' }}
            >
              <code className="text-muted-foreground flex-1 overflow-x-auto text-left font-mono text-xs whitespace-nowrap">
                <span className="text-foreground/50 select-none">$ </span>
                {INSTALL}
              </code>
              <CopyButton value={INSTALL} />
            </div>
            <p
              className="animate-rise text-muted-foreground mt-5 font-mono text-xs"
              style={{ animationDelay: '400ms' }}
            >
              or see{' '}
              <Link
                href="/blog/two-day-neapolitan"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                a complete article
              </Link>{' '}
              rendered by the library
            </p>
          </div>
        </section>

        {/* Live demo */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8">
            <Eyebrow index="01">The idea</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Markdown in, components out
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              Authors write directive blocks inside ordinary Markdown. The parser builds a
              source-mapped AST, the registry validates it, and your renderer of choice takes it
              from there. Below: the actual styled pack rendering live.
            </p>
          </div>
          <div className="reveal-on-scroll">
            <Frame>
              <HomeDemo />
            </Frame>
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/blog/two-day-neapolitan"
              className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-2 font-mono text-xs transition-colors"
            >
              <BadgeCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              this is a fragment — read the complete article: 9 blocks, 3 render targets, 0
              diagnostics
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {/* Validation */}
        <section className="border-y">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-8">
              <Eyebrow index="02">The safety net</Eyebrow>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Errors with line numbers, not broken pages
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                Validation runs before rendering — in your editor, your CI, or your agent loop.
                Diagnostics carry a code, a position, and a fix hint, so an LLM can repair its own
                output.
              </p>
            </div>
            <div className="reveal-on-scroll">
              <Frame>
                <ValidationDemo />
              </Frame>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8">
            <Eyebrow index="03">The system</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              One definition, every surface
            </h2>
          </div>
          <div className="reveal-on-scroll">
            <FeatureBento />
          </div>
        </section>

        {/* Block showcase */}
        <section className="border-y">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <Eyebrow index="04">The generic pack</Eyebrow>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Eight blocks that work in any niche
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                  Pick a block. The example is its real authoring guidance from the registry — the
                  same text LLMs get — rendered live by the styled pack.
                </p>
              </div>
              <Link
                href="/blocks"
                className="text-muted-foreground hover:text-foreground hidden text-sm whitespace-nowrap transition-colors sm:block"
              >
                All blocks →
              </Link>
            </div>
            <div className="reveal-on-scroll">
              <BlockShowcase />
            </div>
          </div>
        </section>

        {/* shadcn install */}
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <Eyebrow index="05">Styled pack</Eyebrow>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Install the components, own the code
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-sm">
            The React pack ships through a shadcn registry. Components land in your app as editable
            source files — Tailwind, your tokens, your rules.
          </p>
          <div className="bg-card mt-6 flex items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-4 text-left shadow-sm">
            <code className="text-muted-foreground flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
              <span className="text-foreground/50 select-none">$ </span>
              {SHADCN_ADD}
            </code>
            <CopyButton value={SHADCN_ADD} />
          </div>
          <p className="text-muted-foreground mt-3 font-mono text-xs">
            registry: https://contentbit.dev/r/{'{name}'}.json
          </p>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm sm:flex-row">
          <p>
            MIT licensed. Built with{' '}
            <Link
              href={"/docs"}
              className="hover:text-foreground underline underline-offset-4"
            >
              Content Blocks
            </Link>
            .
          </p>
          <nav className="flex items-center gap-5">
            <Link href={"/docs"} className="hover:text-foreground transition-colors">
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
    </>
  )
}
