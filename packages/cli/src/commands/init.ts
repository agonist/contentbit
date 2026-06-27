import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'
import { installAgentIntegration } from './agents.js'
import { detectTarget, TARGET_ADAPTERS, TARGETS, type Md, type Target } from './init-targets.js'

const REGISTRY_TEMPLATE = `// Custom block definitions for this project. The CLI and your app share
// this module — Node 22.18+ imports TypeScript directly:
//
//   contentbit validate "content/**/*.md" --registry ./blocks/registry.ts
//
// Definitions stay framework-free (the CLI and every render target use
// them); render components live next door in blocks/components.tsx or
// framework-specific component files copied from the shadcn registry.
// Docs: https://contentbit.dev/docs/guides/custom-blocks
import { defineBlock, markdownBody, type BlockDefinition } from '@contentbit/core'
import { z } from 'zod'

export const quote = defineBlock({
  name: 'quote',
  description: 'A pull quote with an author.',
  props: z.object({
    author: z.string().min(1),
    role: z.string().optional(),
  }),
  content: markdownBody({ minLength: 3 }),
  authoring: {
    useWhen: ['Quoting a person to support a point'],
    avoidWhen: ['Highlighting your own remark, use callout instead'],
    example: ':::quote{author="Ada Lovelace"}\\nThe Analytical Engine weaves algebraic patterns.\\n:::',
  },
})

export default [quote] satisfies BlockDefinition<unknown>[]
`

const EXAMPLE_CONTENT = `---
slug: hello-content-blocks
linksTo:
  - related-contentbit-workflows
aliases:
  - getting-started-contentbit
keywords:
  primary: validated Markdown blocks
  secondary: [content workflow, agent writing]
---

# Hello, Content Blocks

Regular Markdown works everywhere. Blocks add validated structure:

:::callout{type="tip" title="Try breaking this file"}
Run the validate script and you will get file:line:col diagnostics.
:::

:::steps
1. Edit this file and add or break a block.
2. Run \`contentbit validate "content/**/*.md"\`.
3. Render it with the target you picked at init.
:::

This one is a **custom block**, defined in \`blocks/registry.ts\` and rendered
by the \`QuoteBlock\` component, in about twenty lines:

:::quote{author="Ada Lovelace" role="Notes on the Analytical Engine, 1843"}
The Analytical Engine weaves algebraic patterns just as the Jacquard loom
weaves flowers and leaves.
:::
`

const RELATED_CONTENT = `---
slug: related-contentbit-workflows
linksTo:
  - hello-content-blocks
keywords:
  primary: contentbit workflow
  secondary: [validation loop, internal links]
---

# Related contentbit workflows

This supporting page exists to show internal links in frontmatter. The link
graph is authored once with \`slug\` and \`linksTo\`, then contentbit derives
\`linkedFrom\` in \`.contentbit/link-index.json\`.

:::callout{type="note"}
Run \`contentbit links "content/**/*.md" --fix\` after renaming a page. Alias
references in \`linksTo\` are rewritten to the current slug, while \`aliases\`
stays as the rename record.
:::
`

const SEO_CONFIG_TEMPLATE = `import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  pageTypes: {
    alternative: {
      requiredFrontmatter: ['type', 'intent', 'keywords.primary'],
      requiredSections: [
        { id: 'overview', headings: ['Overview', 'Summary'] },
        { id: 'alternatives', headings: ['Best alternatives', 'Top alternatives'] },
        { id: 'comparison', headings: ['Comparison', 'Feature comparison'] },
        { id: 'faq', headings: ['FAQ', 'Frequently asked questions'] },
      ],
      requiredBlocks: ['comparison'],
      recommendedBlocks: ['faq', 'key-metrics'],
      minOutgoingLinks: 2,
    },
    comparison: {
      requiredFrontmatter: ['type', 'intent', 'keywords.primary'],
      requiredSections: [
        { id: 'overview', headings: ['Overview', 'Summary'] },
        { id: 'comparison', headings: ['Comparison', 'Feature comparison'] },
        { id: 'recommendation', headings: ['Recommendation', 'Which should you choose?'] },
      ],
      requiredBlocks: ['comparison'],
      recommendedBlocks: ['faq'],
      minOutgoingLinks: 2,
    },
    integration: {
      requiredFrontmatter: ['type', 'intent', 'keywords.primary'],
      requiredSections: [
        { id: 'overview', headings: ['Overview', 'Summary'] },
        { id: 'setup', headings: ['Setup', 'How to connect'] },
        { id: 'use-cases', headings: ['Use cases', 'Common workflows'] },
      ],
      recommendedBlocks: ['steps', 'faq'],
      minOutgoingLinks: 2,
    },
    'use-case': {
      requiredFrontmatter: ['type', 'intent', 'keywords.primary'],
      requiredSections: [
        { id: 'overview', headings: ['Overview', 'Summary'] },
        { id: 'workflow', headings: ['Workflow', 'How it works'] },
        { id: 'outcomes', headings: ['Outcomes', 'Results'] },
      ],
      recommendedBlocks: ['steps', 'key-metrics'],
      minOutgoingLinks: 2,
    },
  },
  pages: {},
})
`

function detectPackageManager(cwd: string): string {
  // The project's lockfile outranks however the CLI itself was launched.
  const locks: Array<[string, string]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ]
  for (const [file, pm] of locks) {
    if (existsSync(join(cwd, file))) return pm
  }
  const agent = process.env.npm_config_user_agent ?? ''
  for (const pm of ['pnpm', 'yarn', 'bun']) {
    if (agent.startsWith(pm)) return pm
  }
  return 'npm'
}

function installArgs(pm: string, dev: boolean, pkgs: string[]): string[] {
  const add = pm === 'npm' ? 'install' : 'add'
  return dev ? [add, '-D', ...pkgs] : [add, ...pkgs]
}

function dlxCommand(pm: string): [string, string[]] {
  if (pm === 'pnpm') return ['pnpm', ['dlx']]
  if (pm === 'yarn') return ['yarn', ['dlx']]
  if (pm === 'bun') return ['bunx', []]
  return ['npx', ['--yes']]
}

function runInstall(pm: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(pm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

/** Wire the @contentbit shadcn registry and install a styled pack. Returns true on success. */
async function installStyledPack(
  cwd: string,
  pack: string,
  noInstall: boolean,
  io: Io,
): Promise<boolean> {
  const componentsJsonPath = join(cwd, 'components.json')
  const componentsJson = JSON.parse(await readFile(componentsJsonPath, 'utf8')) as {
    registries?: Record<string, string>
  }
  componentsJson.registries ??= {}
  if (!componentsJson.registries['@contentbit']) {
    componentsJson.registries['@contentbit'] = 'https://contentbit.dev/r/{name}.json'
    await writeFile(componentsJsonPath, `${JSON.stringify(componentsJson, null, 2)}\n`, 'utf8')
    io.stdout('added @contentbit registry to components.json')
  }
  if (noInstall) {
    io.stdout(`skipped: shadcn add ${pack}`)
    return true
  }
  const [bin, prefix] = dlxCommand(detectPackageManager(cwd))
  io.stdout(`installing the styled pack: shadcn add ${pack}`)
  const code = await runInstall(bin, [...prefix, 'shadcn@latest', 'add', pack, '--yes'], cwd)
  if (code !== 0) io.stderr('styled pack install failed; falling back to the headless renderer')
  return code === 0
}

/** Write a file unless it already exists; returns what happened for the summary. */
async function scaffold(path: string, content: string): Promise<'created' | 'skipped'> {
  try {
    await readFile(path, 'utf8')
    return 'skipped'
  } catch {
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, content, 'utf8')
    return 'created'
  }
}

export interface InitCommandInput {
  target?: string
  md?: string
  yes?: boolean
  cwd?: string
  noInstall?: boolean
  noPage?: boolean
  noStyled?: boolean
  noAgents?: boolean
  seo?: boolean
}

export async function initCommand(input: InitCommandInput, io: Io): Promise<number> {
  const cwd = input.cwd ?? process.cwd()

  // A project to init into is required.
  let pkg: {
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const pkgPath = join(cwd, 'package.json')
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  } catch {
    io.stderr('No package.json found. Run this inside a project (npm init first).')
    return 1
  }

  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies }

  // Resolve the render target: flag > prompt (interactive) > detection.
  const detected = detectTarget(deps)
  let target: Target
  if (input.target) {
    if (!TARGETS.includes(input.target as Target)) {
      io.stderr(`Unknown target "${input.target}". Use one of: ${TARGETS.join(', ')}`)
      return 2
    }
    target = input.target as Target
  } else if (!input.yes && process.stdin.isTTY && process.stdout.isTTY) {
    const { isCancel, select } = await import('@clack/prompts')
    const answer = await select({
      message: 'Render target?',
      initialValue: detected,
      options: [
        { value: 'react', label: 'React', hint: 'ContentBlocks component' },
        { value: 'astro', label: 'Astro', hint: 'content collections + .astro components' },
        { value: 'markdown', label: 'Plain Markdown', hint: 'fallback rendering only' },
      ],
    })
    if (isCancel(answer)) return 1
    target = answer as Target
  } else {
    target = detected
  }
  const adapter = TARGET_ADAPTERS[target]

  // Resolve the Markdown library: flag > prompt (interactive) > target default.
  // The default gives working prose rendering out of the box; 'none' opts out.
  const choices = adapter.markdownChoices
  let md: Md
  if (input.md) {
    if (!choices.includes(input.md as Md)) {
      io.stderr(`Unknown markdown library "${input.md}". Use one of: ${choices.join(', ')}`)
      return 2
    }
    md = input.md as Md
  } else if (choices.length > 1 && !input.yes && process.stdin.isTTY && process.stdout.isTTY) {
    const { isCancel, select } = await import('@clack/prompts')
    const answer = await select({
      message: 'Markdown library for prose rendering?',
      initialValue: choices[0],
      options: choices.map((c) => ({
        value: c,
        label: c,
        hint: c === 'none' ? 'wire one yourself later' : 'installed and wired for you',
      })),
    })
    if (isCancel(answer)) return 1
    md = answer as Md
  } else {
    md = choices[0]
  }

  // Install runtime packages plus the CLI as a dev dependency.
  const runtime = adapter.runtimeDependencies(md)
  if (input.noInstall) {
    io.stdout(`skipped install: ${runtime.join(' ')} + contentbit (dev)`)
  } else {
    const pm = detectPackageManager(cwd)
    io.stdout(`installing with ${pm}: ${runtime.join(' ')}`)
    if ((await runInstall(pm, installArgs(pm, false, runtime), cwd)) !== 0) {
      io.stderr('install failed')
      return 1
    }
    if ((await runInstall(pm, installArgs(pm, true, ['contentbit']), cwd)) !== 0) {
      io.stderr('install failed')
      return 1
    }
  }

  const plan = await adapter.createPlan({
    cwd,
    deps,
    md,
    noPage: Boolean(input.noPage),
    noStyled: Boolean(input.noStyled),
    io,
    installStyledPack: (pack) => installStyledPack(cwd, pack, Boolean(input.noInstall), io),
  })

  // Scaffold project files; never overwrite.
  const files: Array<[string, string]> = [
    ['blocks/registry.ts', REGISTRY_TEMPLATE],
    ['content/example.md', EXAMPLE_CONTENT],
    ['content/related.md', RELATED_CONTENT],
    ...plan.files,
  ]
  if (input.seo) files.push(['contentbit.seo.config.ts', SEO_CONFIG_TEMPLATE])
  for (const [rel, content] of files) {
    const result = await scaffold(join(cwd, rel), content)
    io.stdout(`${result}: ${rel}`)
  }

  // Wire content scripts.
  const fresh = JSON.parse(await readFile(pkgPath, 'utf8')) as {
    scripts?: Record<string, string>
  }
  fresh.scripts ??= {}
  if (!fresh.scripts['content:check']) {
    fresh.scripts['content:check'] =
      'contentbit validate "content/**/*.md" --registry ./blocks/registry.ts'
    io.stdout('added script: content:check')
  }
  if (!fresh.scripts['content:links']) {
    fresh.scripts['content:links'] = 'contentbit links "content/**/*.md"'
    io.stdout('added script: content:links')
  }
  if (!fresh.scripts['content:doctor']) {
    fresh.scripts['content:doctor'] =
      'contentbit doctor "content/**/*.md" --registry ./blocks/registry.ts'
    io.stdout('added script: content:doctor')
  }
  if (!fresh.scripts.studio) {
    fresh.scripts.studio = 'contentbit studio "content/**/*.md" --registry ./blocks/registry.ts'
    io.stdout('added script: studio')
  }
  if (
    !pkg.scripts?.['content:check'] ||
    !pkg.scripts?.['content:links'] ||
    !pkg.scripts?.['content:doctor'] ||
    !pkg.scripts?.studio
  ) {
    await writeFile(pkgPath, `${JSON.stringify(fresh, null, 2)}\n`, 'utf8')
  }

  // Generate the LLM authoring guide from the registry, ready to paste into a prompt.
  let registry
  try {
    // Include the scaffolded custom blocks so the guide covers them too.
    registry = await loadRegistry(join(cwd, 'blocks/registry.ts'))
  } catch {
    registry = await loadRegistry() // packages not installed yet (--no-install)
  }
  const guide = registry.toAuthoringGuide({ audience: 'llm', includeExamples: true })
  await writeFile(join(cwd, 'contentbit-guide.md'), guide, 'utf8')
  io.stdout('created: contentbit-guide.md (LLM authoring instructions)')

  // Coding-agent integration: an AGENTS.md block for every agent, plus Claude
  // Code skills when a .claude/ directory exists. `contentbit agents` refreshes.
  if (!input.noAgents) {
    await installAgentIntegration(cwd, {}, io)
    io.stdout('Agent integration installed — try asking your agent:')
    io.stdout('  "write a blog post about X" or "audit my content"')
  }

  io.stdout('')
  io.stdout('Done. Next steps:')
  const pm = detectPackageManager(cwd)
  io.stdout(`  1. Browse content locally: ${pm} run studio`)
  io.stdout(`     Inspect content health: ${pm} run content:doctor`)
  io.stdout(`     Validate the starter content: ${pm} run content:check`)
  io.stdout(`     Build the link index: ${pm} run content:links`)
  for (const line of plan.nextSteps) io.stdout(line)
  io.stdout('  Docs: https://contentbit.dev/docs')
  return 0
}
