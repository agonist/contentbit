import type { Metadata } from 'next'

import { ContentGraphDemo } from '@/components/content-graph-demo'
import { Frame } from '@/components/frame'
import { InstallTabs } from '@/components/install-tabs'
import { LandingFooter } from '@/components/landing-footer'
import { SectionHeading } from '@/components/section-heading'
import { SeoDoctorDemo } from '@/components/seo-doctor-demo'
import { SeoWorkflowDemo } from '@/components/seo-workflow-demo'
import { SiteHeader } from '@/components/site-header'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  GitBranch,
  Languages,
  ListChecks,
  MapPin,
  Network,
  PanelsTopLeft,
  Search,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Programmatic SEO toolkit for developers',
  description:
    'Turn page families into reusable contracts, agent-ready briefs, internal-link rules, and automated content quality gates with contentbit.',
  alternates: { canonical: '/programmatic-seo' },
}

const PAGE_FAMILIES = [
  {
    icon: PanelsTopLeft,
    name: 'Alternative pages',
    example: '/alternatives/[product]',
    requirements: 'comparison · pros-cons · FAQ',
  },
  {
    icon: BookOpen,
    name: 'Glossary libraries',
    example: '/glossary/[term]',
    requirements: 'definition · examples · related terms',
  },
  {
    icon: MapPin,
    name: 'Location pages',
    example: '/locations/[city]',
    requirements: 'local facts · services · nearby pages',
  },
  {
    icon: Boxes,
    name: 'Integration directories',
    example: '/integrations/[tool]',
    requirements: 'use cases · setup · related integrations',
  },
]

const FAQS = [
  {
    question: 'Does Contentbit generate the pages?',
    answer:
      'Contentbit governs page creation rather than inventing it. Your writers, scripts, or coding agents create the Markdown; Contentbit supplies the brief, content rules, validation, and rendering pipeline.',
  },
  {
    question: 'Does it replace a CMS?',
    answer:
      'Not necessarily. Contentbit is file-first and works especially well when Markdown lives in a codebase, but its parser, validation, and rendering packages can sit inside a broader publishing stack.',
  },
  {
    question: 'Can every page family use different requirements?',
    answer:
      'Yes. Each family can require different frontmatter, sections, structured blocks, and internal links. Defaults can classify existing folders, while explicit plans cover pages that do not exist yet.',
  },
  {
    question: 'Does it support multilingual content?',
    answer:
      'Yes. Stable page keys can resolve locale-specific slugs, links, and aliases without sending French, Spanish, and English pages into the wrong clusters.',
  },
]

export default function ProgrammaticSeoPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_0.72fr] lg:items-center">
            <div>
              <p className="animate-rise font-mono text-xs tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                Programmatic SEO for codebases
              </p>
              <h1
                className="animate-rise mt-5 text-[2.8rem] leading-[1.02] font-semibold tracking-tighter text-balance sm:text-[4.25rem]"
                style={{ animationDelay: '80ms' }}
              >
                Turn your search strategy into a repeatable content system.
              </h1>
              <p
                className="text-muted-foreground animate-rise mt-6 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg"
                style={{ animationDelay: '160ms' }}
              >
                Model page families, brief agents, validate every draft, and keep internal links
                intact as your content library grows.
              </p>
              <div
                className="animate-rise mt-8 flex flex-col items-start gap-3 sm:flex-row"
                style={{ animationDelay: '240ms' }}
              >
                <Link
                  href="/docs/guides/programmatic-seo"
                  className="bg-primary text-primary-foreground inline-flex h-10 items-center gap-2 px-5 text-sm font-medium shadow-sm"
                >
                  Build your first page family
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/docs/guides/seo-briefs"
                  className="bg-background hover:bg-accent inline-flex h-10 items-center border px-5 text-sm font-medium shadow-sm transition-colors"
                >
                  Explore SEO contracts
                </Link>
              </div>
            </div>

            <div
              className="animate-rise bg-background/90 border shadow-xl backdrop-blur"
              style={{ animationDelay: '240ms' }}
            >
              <div className="text-muted-foreground flex items-center border-b px-4 py-3 font-mono text-[11px]">
                page family · alternative
                <span className="ml-auto text-emerald-600 dark:text-emerald-400">active</span>
              </div>
              <div className="p-5">
                <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
                  contract applied to
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">48 pages</p>
                <div className="mt-6 space-y-3 text-sm">
                  {[
                    ['Required sections', '3'],
                    ['Required blocks', '2'],
                    ['Minimum links', '3'],
                    ['Planned, not written', '11'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center border-t pt-3">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="ml-auto font-mono text-xs">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 border-t px-5 py-3 font-mono text-[11px]">
                <GitBranch className="size-3.5" />
                stored with the code, reviewed in git
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeading
            index="01"
            eyebrow="Page families"
            title="Encode what should repeat without letting it drift"
            body="A page family is a reusable writing and review contract. Start with the search formats that already matter to your business."
          />
          <div className="mt-9 grid border sm:grid-cols-2 lg:grid-cols-4">
            {PAGE_FAMILIES.map(({ icon: Icon, name, example, requirements }, index) => (
              <div
                key={name}
                className={`group p-5 transition-colors hover:bg-muted/30 ${index > 0 ? 'border-t sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-t lg:border-t-0' : ''}`}
              >
                <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="mt-8 text-sm font-semibold">{name}</h2>
                <code className="text-muted-foreground mt-2 block font-mono text-[11px]">
                  {example}
                </code>
                <p className="text-muted-foreground mt-5 border-t pt-3 text-xs leading-relaxed">
                  {requirements}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <SectionHeading
              index="02"
              eyebrow="The operating loop"
              title="Plan before writing. Check before publishing."
              body="The contract is not a template that gets forgotten after generation. It participates in every stage of the page lifecycle."
            />
            <div className="reveal-on-scroll mt-9">
              <Frame>
                <SeoWorkflowDemo />
              </Frame>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <SectionHeading
                index="03"
                eyebrow="Controlled AI output"
                title="Give the agent a contract, not a vague prompt"
                body="Contentbit combines the page plan with the live project inventory. The resulting brief tells an agent what this page needs and how it connects to everything around it."
              />
              <div className="mt-6 grid gap-3 font-mono text-xs">
                {[
                  [Search, 'target intent and keywords'],
                  [ListChecks, 'sections and acceptance checks'],
                  [Network, 'required and related links'],
                  [Sparkles, 'live block authoring rules'],
                ].map(([Icon, text]) => (
                  <div key={text as string} className="flex items-center gap-3 border px-4 py-3">
                    <Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    {text as string}
                  </div>
                ))}
              </div>
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
            <div className="reveal-on-scroll">
              <Frame>
                <ContentGraphDemo />
              </Frame>
            </div>
            <div>
              <SectionHeading
                index="04"
                eyebrow="Internal linking"
                title="Grow a graph, not a folder of orphans"
                body="Required links live alongside page plans. Contentbit resolves the project graph, reports missing destinations and backlinks, and keeps renamed slugs connected through aliases."
              />
              <div className="mt-6 flex items-start gap-3 border-t pt-5 text-sm">
                <Languages className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-medium">Designed for localized page libraries</p>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    Share stable keys while keeping slugs, keywords, and link neighborhoods local.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeading
            index="05"
            eyebrow="Fits the codebase"
            title="A local content system your team can inspect"
            body="No opaque generation queue and no hosted editor required. Contracts and Markdown stay versioned alongside the application that publishes them."
            align="center"
          />
          <div className="mt-10 grid border md:grid-cols-3">
            {[
              [
                '01',
                'Configuration',
                'Page families, content paths, registries, and link rules live in typed project files.',
              ],
              [
                '02',
                'Studio',
                'Preview pages, briefs, keywords, diagnostics, links, backlinks, and content health locally.',
              ],
              [
                '03',
                'Automation',
                'Use stable JSON and strict exit codes in coding agents, scripts, and continuous integration.',
              ],
            ].map(([index, title, body], itemIndex) => (
              <div
                key={title}
                className={`p-6 ${itemIndex > 0 ? 'border-t md:border-t-0 md:border-l' : ''}`}
              >
                <span className="font-mono text-[10px] tracking-widest text-emerald-600 dark:text-emerald-400">
                  {index}
                </span>
                <h3 className="mt-6 text-base font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y">
          <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
            <SectionHeading
              index="06"
              eyebrow="Questions"
              title="Where Contentbit fits"
              body="Contentbit focuses on the contract between search planning, content creation, and the code that publishes it."
            />
            <div className="mt-8 border-t">
              {FAQS.map(({ question, answer }) => (
                <details key={question} className="group border-b">
                  <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-sm font-medium marker:hidden">
                    {question}
                    <span className="text-muted-foreground ml-auto font-mono text-lg font-normal transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="text-muted-foreground max-w-2xl pb-5 text-sm leading-relaxed">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-foreground)_6%,transparent),transparent_62%)]" />
          <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <p className="font-mono text-xs tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
              One command, one page family
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Put a contract around your next SEO page.
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              Start with the scaffold, then adapt the page types and block registry to your own
              search program.
            </p>
            <div className="mx-auto mt-8 max-w-lg">
              <InstallTabs command="contentbit@latest init --seo" />
            </div>
            <p className="text-muted-foreground mt-5 flex items-center justify-center gap-2 font-mono text-[11px]">
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              open source · portable Markdown · no hosted account
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  )
}
