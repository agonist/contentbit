import type { Metadata } from 'next'

import { AgentSession } from '@/components/agent-session'
import { BlockShowcase } from '@/components/block-showcase'
import { ContentGraphDemo } from '@/components/content-graph-demo'
import { Frame } from '@/components/frame'
import { HeroGlyphs } from '@/components/hero-glyphs'
import { InstallTabs } from '@/components/install-tabs'
import { LandingFooter } from '@/components/landing-footer'
import { PublishDemo } from '@/components/publish-demo'
import { SectionHeading } from '@/components/section-heading'
import { SeoDoctorDemo } from '@/components/seo-doctor-demo'
import { SeoWorkflowDemo } from '@/components/seo-workflow-demo'
import { SiteHeader } from '@/components/site-header'
import { ArrowRight, Blocks, Check, FileStack, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Programmatic SEO content infrastructure',
  description:
    'Define reusable page contracts, give agents a brief for every page, and validate content structure and internal links before publishing.',
}

const FAMILY_FEATURES = [
  {
    icon: FileStack,
    title: 'Model page families',
    body: 'Turn alternatives, glossaries, comparisons, and guides into reusable content contracts.',
  },
  {
    icon: Sparkles,
    title: 'Brief every page',
    body: 'Give writers and agents the exact intent, sections, blocks, keywords, and links to satisfy.',
  },
  {
    icon: ShieldCheck,
    title: 'Enforce the contract',
    body: 'Run the same structural, block, and link checks locally, in agent loops, and in CI.',
  },
]

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b">
          <HeroGlyphs />
          <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
            <div className="animate-rise" style={{ animationDelay: '0ms' }}>
              <Link
                href="/docs/guides/programmatic-seo"
                className="bg-background/70 text-muted-foreground hover:text-foreground inline-flex items-center gap-2 border px-3 py-1 font-mono text-xs backdrop-blur transition-colors"
              >
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Open-source toolkit for programmatic SEO
              </Link>
            </div>
            <h1
              className="animate-rise mt-7 text-[2.8rem] leading-[1.02] font-semibold tracking-tighter text-balance sm:text-[4.5rem]"
              style={{ animationDelay: '80ms' }}
            >
              Build programmatic SEO pages
              <span className="text-muted-foreground"> that stay consistent.</span>
            </h1>
            <p
              className="text-muted-foreground animate-rise mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg"
              style={{ animationDelay: '160ms' }}
            >
              Define reusable page contracts, give agents a brief for every page, and validate
              content structure and internal links before publishing.
            </p>
            <div
              className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/programmatic-seo"
                className="bg-primary text-primary-foreground inline-flex h-10 items-center gap-2 px-5 text-sm font-medium shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-95"
              >
                Explore the workflow
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/docs"
                className="bg-background/80 hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center border px-5 text-sm font-medium shadow-sm backdrop-blur transition-all active:scale-95"
              >
                Read the docs
              </Link>
            </div>
            <div className="animate-rise mx-auto mt-9 max-w-lg" style={{ animationDelay: '320ms' }}>
              <InstallTabs command="contentbit@latest init --seo" />
            </div>
            <p
              className="animate-rise text-muted-foreground mt-5 font-mono text-[11px] tracking-wide"
              style={{ animationDelay: '400ms' }}
            >
              TypeScript · React · Astro · plain Markdown · MIT licensed
            </p>
          </div>
        </section>

        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-[0.65fr_1.35fr] lg:items-end">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                  Choose your starting point
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
                  Add the toolkit or start from the reference application.
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed lg:justify-self-end">
                Contentbit can meet an established Markdown library where it is, or give a new Astro
                project a production-shaped SEO foundation. Both paths use the same portable
                contracts and quality gates.
              </p>
            </div>
            <div className="mt-8 grid border md:grid-cols-2">
              <div className="p-5 sm:p-6">
                <FileStack className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-muted-foreground mt-5 font-mono text-[10px] tracking-widest uppercase">
                  Existing content library
                </p>
                <h3 className="mt-2 text-base font-semibold">Adopt without changing files</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Scan current Markdown, integrity issues, locale coverage, and inferred contracts.
                  The adoption report is read-only until you choose what to keep.
                </p>
                <code className="bg-muted mt-5 block overflow-x-auto px-3 py-2.5 font-mono text-[11px]">
                  contentbit adopt &quot;content/**/*.md&quot; --dry-run
                </code>
                <Link
                  href="/docs/guides/adoption"
                  className="text-muted-foreground hover:text-foreground mt-5 inline-flex items-center gap-2 font-mono text-xs transition-colors"
                >
                  Follow the adoption guide
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              <div className="border-t p-5 sm:p-6 md:border-t-0 md:border-l">
                <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-muted-foreground mt-5 font-mono text-[10px] tracking-widest uppercase">
                  New Astro application
                </p>
                <h3 className="mt-2 text-base font-semibold">
                  Start from the production reference
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Use the separate multilingual Astro template with routes, metadata, structured
                  data, feeds, social images, Studio, Doctor, and CI already connected.
                </p>
                <code className="bg-muted mt-5 block overflow-x-auto px-3 py-2.5 font-mono text-[11px]">
                  github.com/agonist/astro-speedrun-seo
                </code>
                <Link
                  href="/docs/guides/production-astro"
                  className="text-muted-foreground hover:text-foreground mt-5 inline-flex items-center gap-2 font-mono text-xs transition-colors"
                >
                  Explore the Astro template
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeading
            index="01"
            eyebrow="The workflow"
            title="One contract, every page in the family"
            body="Model the repeatable shape once. Contentbit turns it into a page brief before writing and a quality gate after writing."
          />
          <div className="reveal-on-scroll mt-9">
            <Frame>
              <SeoWorkflowDemo />
            </Frame>
          </div>
          <div className="mt-8 grid border md:grid-cols-3">
            {FAMILY_FEATURES.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className={`p-5 sm:p-6 ${index > 0 ? 'border-t md:border-t-0 md:border-l' : ''}`}
              >
                <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
              <SectionHeading
                index="02"
                eyebrow="Brief before prompt"
                title="Agents write inside the plan"
                body="The agent gets live block instructions and the target page brief before it drafts. It knows what to include, where to link, and what clean means."
              />
              <Link
                href="/docs/guides/agents"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 font-mono text-xs transition-colors"
              >
                Agent integration guide
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="reveal-on-scroll mt-9">
              <Frame>
                <AgentSession
                  title="agent · content/alternatives"
                  steps={[
                    { kind: 'user', text: 'write the planned Semrush alternatives page' },
                    { kind: 'skill', name: 'contentbit-author' },
                    {
                      kind: 'command',
                      command: 'contentbit brief semrush-alternatives --json',
                      exitCode: 0,
                      output:
                        'type: alternative · intent: commercial\nsections: overview, comparison, faq\nlinksTo: seo-tools-comparison',
                    },
                    {
                      kind: 'assistant',
                      text: 'Writing the page from the brief with comparison and FAQ blocks, then checking the project.',
                    },
                    {
                      kind: 'command',
                      command: 'contentbit doctor --strict-seo',
                      exitCode: 1,
                      output:
                        'CB_SEO_LINK_REQUIRED content/alternatives/semrush.md\nmissing required link: seo-tools-comparison',
                    },
                    {
                      kind: 'assistant',
                      text: 'The draft is structurally complete but missing its hub link. Adding it and checking again.',
                    },
                    {
                      kind: 'command',
                      command: 'contentbit doctor --strict-seo',
                      exitCode: 0,
                      output: '32 pages · 0 errors · 0 required SEO findings',
                    },
                  ]}
                />
              </Frame>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <SectionHeading
                index="03"
                eyebrow="The quality gate"
                title="Catch content drift before your users do"
                body="A page can be valid Markdown and still fail the program. Doctor turns your page-family contract, block schemas, and link graph into one ranked repair plan."
              />
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  'Readable diagnostics with file and line context',
                  'Stable JSON output for agents and automation',
                  'Strict modes that can block a CI build',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal-on-scroll">
              <Frame>
                <SeoDoctorDemo />
              </Frame>
            </div>
          </div>
        </section>

        <section className="border-y">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="reveal-on-scroll lg:order-1">
              <Frame>
                <ContentGraphDemo />
              </Frame>
            </div>
            <div className="lg:order-2">
              <SectionHeading
                index="04"
                eyebrow="The content graph"
                title="Internal links become part of the model"
                body="Declare relationships in frontmatter and let Contentbit resolve links, backlinks, aliases, and localized page keys across the whole project."
              />
              <div className="mt-6 space-y-4 border-l pl-5">
                <div>
                  <h3 className="text-sm font-semibold">Plan links before files exist</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    A planned page can already belong to a hub and carry required destinations.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Keep multilingual clusters coherent</h3>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    Resolve localized slugs through stable keys without mixing locales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeading
            index="05"
            eyebrow="The library"
            title="Keep one portable content model"
            body="Contentbit processes and validates the document before render. React, Astro, and Markdown adapters decide presentation without changing what writers or agents author."
          />
          <div className="reveal-on-scroll mt-9">
            <Frame>
              <PublishDemo />
            </Frame>
          </div>
          <div className="mt-6 flex items-center gap-2 font-mono text-xs">
            <Blocks className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <Link
              href="/docs/guides/renderers"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              See the rendering guides <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <section className="border-y">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="flex items-end justify-between gap-4">
              <SectionHeading
                index="06"
                eyebrow="Structured building blocks"
                title="Give agents useful structure without arbitrary components"
                body="Comparisons, FAQs, steps, metrics, and other registered blocks stay typed, validated, portable, and editable in your own design system."
              />
              <Link
                href="/blocks"
                className="text-muted-foreground hover:text-foreground hidden shrink-0 text-sm transition-colors sm:block"
              >
                Explore all blocks →
              </Link>
            </div>
            <div className="reveal-on-scroll mt-9">
              <BlockShowcase />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <p className="font-mono text-xs tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
              Start with one page family
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Make scale a property of the system, not the prompt.
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              Scaffold the library, project config, SEO contracts, Studio, and agent instructions in
              one command.
            </p>
            <div className="mx-auto mt-8 max-w-lg">
              <InstallTabs command="contentbit@latest init --seo" />
            </div>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/docs/guides/programmatic-seo"
                className="bg-primary text-primary-foreground inline-flex h-10 items-center gap-2 px-5 text-sm font-medium"
              >
                Follow the workflow
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/playground"
                className="hover:bg-accent inline-flex h-10 items-center px-5 text-sm font-medium transition-colors"
              >
                Try the block playground
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  )
}
