import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { Io } from '../run.js'

export type Target = 'react' | 'markdown' | 'astro'
export type Md = 'react-markdown' | 'none'

export const TARGETS: Target[] = ['react', 'markdown', 'astro']

type ScaffoldFile = [path: string, content: string]

export interface InitTargetPlan {
  files: ScaffoldFile[]
  nextSteps: string[]
}

interface InitTargetContext {
  cwd: string
  deps: Record<string, string>
  md: Md
  noPage: boolean
  noStyled: boolean
  io: Io
  installStyledPack: (pack: string) => Promise<boolean>
}

interface InitTargetAdapter {
  markdownChoices: Md[]
  runtimeDependencies(md: Md): string[]
  createPlan(ctx: InitTargetContext): Promise<InitTargetPlan>
}

const RUNTIME_BASE = ['@contentbit/core', '@contentbit/blocks', 'zod']

/** blocks/components.tsx — React components for custom blocks, next to their definitions. */
function blockComponentsTemplate(styled: boolean): string {
  const body = styled
    ? `  return (
    <figure className="my-6 border-s-2 ps-4">
      <blockquote className="text-lg italic">{ctx.renderMarkdown(data.markdown)}</blockquote>
      <figcaption className="text-muted-foreground mt-2 text-sm">
        — {String(node.props.author)}
        {node.props.role ? \`, \${String(node.props.role)}\` : null}
      </figcaption>
    </figure>
  )`
    : `  return (
    <figure style={{ margin: '1.5rem 0', borderLeft: '2px solid #d4d4d4', paddingLeft: '1rem' }}>
      <blockquote style={{ fontStyle: 'italic' }}>{ctx.renderMarkdown(data.markdown)}</blockquote>
      <figcaption style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
        — {String(node.props.author)}
        {node.props.role ? \`, \${String(node.props.role)}\` : null}
      </figcaption>
    </figure>
  )`
  return `import { defineBlockComponent, defineBlockComponents } from '@contentbit/react'

import { quote } from './registry'

// One React component per custom block, keyed by block name. Definitions
// live in ./registry.ts — add a block there, add its component here, and
// the rest of the app never changes.
const QuoteBlock = defineBlockComponent(quote, ({ node, ctx }) => {
  const data = node.data
${body}
})

export const blockComponents = defineBlockComponents([quote], {
  quote: QuoteBlock,
})
`
}

/** The wrapper component: styled pack or headless, with or without a Markdown lib. */
function reactComponent(styled: boolean, mdWired: boolean, blocksImport: string): string {
  const mdImport = mdWired ? "import ReactMarkdown from 'react-markdown'\n" : ''
  const mdProp = mdWired
    ? '\n      renderMarkdown={(md) => <ReactMarkdown>{md}</ReactMarkdown>}'
    : `\n      // TODO: plug your Markdown library in here, e.g. react-markdown.
      // One function renders all prose: https://contentbit.dev/docs/guides/markdown
      // renderMarkdown={(md) => <Markdown source={md} />}`
  const rendererImport = styled
    ? `\n// The styled pack installed by shadcn. Yours to edit.
import { ContentRenderer } from '@/components/content-blocks/content-renderer'`
    : ''
  const renderer = styled ? 'ContentRenderer' : 'ContentBlocks'
  const reactImport = styled ? '' : "import { ContentBlocks } from '@contentbit/react'\n"
  return `'use client'

import { genericBlocks } from '@contentbit/blocks'
import { compileDocument, createBlockRegistry } from '@contentbit/core'
${reactImport}${mdImport}${rendererImport}
// Everything block-related lives in the blocks/ folder: definitions in
// registry.ts (shared with the validate CLI), components in components.tsx.
import customBlocks from '${blocksImport}/registry'
import { blockComponents } from '${blocksImport}/components'

const registry = createBlockRegistry().use(genericBlocks()).use(customBlocks)

export function Content({ source }: { source: string }) {
  const result = compileDocument(source, registry)
  return (
    <${renderer}
      document={result.document}
      components={blockComponents}${mdProp}
    />
  )
}
`
}

type Framework = 'tanstack' | 'next' | null

interface FrameworkLayout {
  framework: Framework
  componentPath: string
  pagePath: string | null
}

/** Where the component and example page belong for the detected framework. */
function detectFramework(cwd: string, deps: Record<string, string>): FrameworkLayout {
  if (
    (deps['@tanstack/react-start'] || deps['@tanstack/react-router']) &&
    existsSync(join(cwd, 'src/routes'))
  ) {
    return {
      framework: 'tanstack',
      componentPath: 'src/components/content-blocks.tsx',
      pagePath: 'src/routes/example.tsx',
    }
  }
  if (deps.next) {
    const appDir = existsSync(join(cwd, 'src/app')) ? 'src/app' : 'app'
    if (existsSync(join(cwd, appDir))) {
      return {
        framework: 'next',
        componentPath: 'components/content-blocks.tsx',
        pagePath: `${appDir}/example/page.tsx`,
      }
    }
  }
  return { framework: null, componentPath: 'components/content-blocks.tsx', pagePath: null }
}

const TANSTACK_PAGE = `import { createFileRoute } from '@tanstack/react-router'

import { Content } from '../components/content-blocks'
// Vite's ?raw import inlines the Markdown as a string at build time.
import source from '../../content/example.md?raw'

export const Route = createFileRoute('/example')({ component: ExamplePage })

function ExamplePage() {
  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Content source={source} />
    </main>
  )
}
`

const NEXT_PAGE = `import { readFile } from 'node:fs/promises'

// If your project has no "@/" path alias, switch to a relative import.
import { Content } from '@/components/content-blocks'

export default async function ExamplePage() {
  const source = await readFile('content/example.md', 'utf8')
  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Content source={source} />
    </main>
  )
}
`

const ASTRO_CONTENT_CONFIG = `import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

export const collections = {
  articles: defineCollection({
    // Astro's builtin Markdown loader. Entry bodies are parsed and validated
    // where they render (see src/pages/example.astro); \`contentbit validate\`
    // covers the same files in CI.
    loader: glob({ pattern: '**/*.md', base: './content' }),
  }),
}
`

const ASTRO_QUOTE_BLOCK = `---
// The Astro component for the custom \`quote\` block defined in blocks/registry.ts.
// Block props arrive as component props; nested content arrives via <slot />.
interface Props {
  author: string
  role?: string
}

const { author, role } = Astro.props
---

<figure style="margin: 1.5rem 0; border-left: 2px solid #d4d4d4; padding-left: 1rem;">
  <blockquote style="font-style: italic;"><slot /></blockquote>
  <figcaption style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">
    — {author}{role ? \`, \${role}\` : null}
  </figcaption>
</figure>
`

/** The example page: styled pack renderer or the headless ContentBlocks. */
function astroPage(styled: boolean): string {
  const importLine = styled
    ? "import ContentRenderer from '../components/content-blocks/content-renderer.astro'"
    : "import { ContentBlocks } from '@contentbit/astro/components'"
  const renderer = styled ? 'ContentRenderer' : 'ContentBlocks'
  return `---
import { genericBlocks } from '@contentbit/blocks'
import { assertValidDocument, compileDocument, createBlockRegistry } from '@contentbit/core'
import { getEntry } from 'astro:content'

${importLine}

// Definitions in blocks/registry.ts are shared with the validate CLI.
import customBlocks from '../../blocks/registry'
import QuoteBlock from '../../blocks/QuoteBlock.astro'

// Entry ids are the file path relative to the collection base, minus ".md".
const entry = await getEntry('articles', 'example')
if (!entry?.body) throw new Error('Entry "example" not found in the articles collection.')

const registry = createBlockRegistry().use(genericBlocks()).use(customBlocks)
// Static pages render at build time, so invalid blocks fail the build here.
const document = assertValidDocument(compileDocument(entry.body, registry), entry.id)
---

<main style="max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem;">
  <${renderer} document={document} components={{ quote: QuoteBlock }} />
</main>
`
}

function runtimeWith(...extra: string[]): string[] {
  return [...RUNTIME_BASE, ...extra]
}

function reactRuntime(md: Md): string[] {
  return runtimeWith('@contentbit/react', ...(md === 'none' ? [] : [md]))
}

async function createReactPlan(ctx: InitTargetContext): Promise<InitTargetPlan> {
  const files: ScaffoldFile[] = []
  const layout = detectFramework(ctx.cwd, ctx.deps)
  const componentsJsonPath = join(ctx.cwd, 'components.json')
  const styled =
    !ctx.noStyled &&
    existsSync(componentsJsonPath) &&
    (await ctx.installStyledPack('@contentbit/generic-pack'))

  const depth = layout.componentPath.split('/').length - 1
  const blocksImport = `${'../'.repeat(depth)}blocks`
  files.push(['blocks/components.tsx', blockComponentsTemplate(styled)])
  files.push([
    layout.componentPath,
    reactComponent(styled, ctx.md === 'react-markdown', blocksImport),
  ])
  if (!ctx.noPage && layout.pagePath) {
    files.push([layout.pagePath, layout.framework === 'tanstack' ? TANSTACK_PAGE : NEXT_PAGE])
  }

  const nextSteps =
    !ctx.noPage && layout.pagePath
      ? ['  2. Start the dev server and open /example to see the article rendered.']
      : [
          '  2. Render it: import { Content } from "./components/content-blocks"',
          '     <Content source={...content/example.md as a string} />',
        ]
  nextSteps.push('  3. Styled components: pnpm dlx shadcn@latest add @contentbit/generic-pack')

  return { files, nextSteps }
}

async function createAstroPlan(ctx: InitTargetContext): Promise<InitTargetPlan> {
  const files: ScaffoldFile[] = [['blocks/QuoteBlock.astro', ASTRO_QUOTE_BLOCK]]
  const componentsJsonPath = join(ctx.cwd, 'components.json')
  const styled =
    !ctx.noStyled &&
    existsSync(componentsJsonPath) &&
    (await ctx.installStyledPack('@contentbit/astro-pack'))

  // Every config filename Astro resolves (src/content.config.* plus the legacy
  // src/content/config.* location), so we never scaffold a second config that
  // Astro would silently ignore.
  const configCandidates = ['ts', 'mts', 'mjs', 'js'].flatMap((ext) => [
    `src/content.config.${ext}`,
    `src/content/config.${ext}`,
  ])
  const existingConfig = configCandidates.find((p) => existsSync(join(ctx.cwd, p)))
  if (existingConfig) {
    ctx.io.stdout(`content config exists (${existingConfig}); add this collection manually:`)
    ctx.io.stdout(ASTRO_CONTENT_CONFIG)
    ctx.io.stdout('the example page expects the "articles" collection above')
  } else {
    files.push(['src/content.config.ts', ASTRO_CONTENT_CONFIG])
  }
  if (!ctx.noPage) files.push(['src/pages/example.astro', astroPage(styled)])

  return {
    files,
    nextSteps: [
      '  2. Start the dev server and open /example to see the article rendered.',
      '  3. Styled components: pnpm dlx shadcn@latest add @contentbit/astro-pack',
    ],
  }
}

export const TARGET_ADAPTERS: Record<Target, InitTargetAdapter> = {
  react: {
    markdownChoices: ['react-markdown', 'none'],
    runtimeDependencies: reactRuntime,
    createPlan: createReactPlan,
  },
  markdown: {
    markdownChoices: ['none'],
    runtimeDependencies: () => runtimeWith(),
    createPlan: async () => ({
      files: [],
      nextSteps: ['  2. Render it: contentbit render content/example.md'],
    }),
  },
  astro: {
    // Astro projects usually reuse their host Markdown pipeline.
    markdownChoices: ['none'],
    runtimeDependencies: () => runtimeWith('@contentbit/astro'),
    createPlan: createAstroPlan,
  },
}

export function detectTarget(deps: Record<string, string>): Target {
  const hasReact = Boolean(deps.react)
  const hasAstro = Boolean(deps.astro)
  return hasAstro ? 'astro' : hasReact ? 'react' : 'markdown'
}
