import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

// Everything here is static and project-independent by design: skills fetch
// live data (authoring guide, stats, diagnostics) by running the CLI, so the
// registry stays the single source of truth and nothing can drift. Bump the
// frontmatter version when a template changes; `contentbit agents` re-runs
// overwrite in place.
const TEMPLATE_VERSION = 4

const AUTHOR_SKILL = `---
name: contentbit-author
description: |
  Write or edit contentbit Markdown content (directive blocks like :::callout).
  Use when asked to create or modify content documents in a project that uses
  contentbit — blog posts, docs pages, changelogs, any Markdown covered by
  \`contentbit validate\`.
version: ${TEMPLATE_VERSION}
---

# Writing contentbit content

contentbit documents are plain Markdown plus directive blocks
(\`:::name{props} ... :::\`). Every block has a schema. Never guess block names,
props, or body shapes — fetch the live guide from the project's registry first.

## Find the project conventions

Check \`package.json\` for a \`content:check\` script. It holds the canonical
validate invocation for this project: the content glob and, if present, the
\`--registry <path>\` and \`--no-generic-blocks\` flags. Reuse those arguments
below. No script? Default to \`content/**/*.md\` with no \`--registry\` flag.
If the project has a \`content:links\` script, use it for the internal-link
index; otherwise run \`contentbit links <content glob>\` directly.

## The loop

1. **Fetch the authoring guide** (always — it covers this project's custom blocks):

   \`\`\`sh
   contentbit instructions --audience llm [--registry <path from content:check>] [--no-generic-blocks]
   \`\`\`

   Read it before writing. It documents every available block: props, body
   shape, and when to use or avoid it.

2. **Write the document.** Plain Markdown everywhere; blocks only where the
   guide's use-when guidance fits. Keep frontmatter consistent with sibling
   documents in the same folder. If sibling documents use \`slug\`, \`linksTo\`,
   \`aliases\`, or \`keywords\`, run the link index first:

   \`\`\`sh
   contentbit links <content glob>
   \`\`\`

   Read \`.contentbit/link-index.json\` to pick existing slugs and related
   pages. Author only \`slug\`, \`linksTo\`, \`aliases\`, and \`keywords\` in
   frontmatter; never write derived \`linkedFrom\` into source files. When
   creating a linked page, include \`keywords.primary\` and
   \`keywords.secondary\` with search-intent phrases that would help future
   agents choose this page as a \`linksTo\` target.

3. **Validate and fix until clean:**

   \`\`\`sh
   contentbit validate <file> [--registry <path>] [--no-generic-blocks]
   \`\`\`

   Diagnostics print to stderr as \`file:line:col severity CODE message\`, often
   with a \`hint:\` line suggesting the fix. Exit 0 means clean; exit 1 means
   errors remain. If the document has link frontmatter, validate the full
   content glob so cross-file links are checked against the whole graph. Fix
   every diagnostic and re-run. Never finish with a failing validate.

4. **Refresh internal links when present:**

   \`\`\`sh
   contentbit links <content glob> --fix
   \`\`\`

   \`--fix\` only rewrites \`linksTo\` values that point at known aliases. It
   does not invent links, remove aliases, or write backlinks. Re-run validate
   after it changes files.

## Failure modes

- \`contentbit\` not found or no registry resolvable: the project is not set up.
  Say so and suggest \`npx contentbit@latest init\` — do not invent block syntax.
- A block you want does not exist: use plain Markdown, or ask whether to define
  a custom block in the registry. Never emit an unregistered block name.
`

const AUDIT_SKILL = `---
name: contentbit-audit
description: |
  Audit contentbit Markdown content health using document stats. Use when asked
  to audit, review, or find improvements across content — thin pages, missing
  structure, validation issues — in a project that uses contentbit.
version: ${TEMPLATE_VERSION}
---

# Auditing contentbit content

\`contentbit doctor\` is the first audit command. It reads content once, runs
block validation, link validation, and document stats, then prints a ranked
repair plan. It is read-only: it does not write the link index and never edits
source files. \`contentbit stats\` remains useful when you need raw JSON metrics.
\`contentbit links\` builds the frontmatter-authored internal-link graph and can
heal alias references with \`--fix\`.

## Gather

Check \`package.json\` for \`content:doctor\` first. If it exists, run it. If it
does not, use \`content:check\` to find this project's content glob and
\`--registry\` / \`--no-generic-blocks\` flags, then run:

\`\`\`sh
contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks]
contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks] --json
contentbit stats "content/**/*.md" [--registry <path>] [--no-generic-blocks]
contentbit links "content/**/*.md"
\`\`\`

\`doctor --json\` prints a stable report with summary counts and ranked
findings. \`stats\` prints per-file metrics: frontmatter data, a heading
\`outline\` with per-section word counts, \`blocks.byName\` usage counts,
\`links.domains\`, and a \`validation\` summary (\`errors\`/\`warnings\`).
\`contentbit links\` writes \`.contentbit/link-index.json\`, whose pages contain
\`slug\`, resolved \`linksTo\`, derived \`linkedFrom\`, \`aliases\`, and
\`keywords\`.

## Interpret

Prioritize findings in the order \`doctor\` reports them:

1. **Validation errors and warnings** — broken content ships broken pages.
2. **Internal-link errors** — unresolved links, duplicate slugs, and alias
   conflicts from \`contentbit links\`.
3. **Orphans and self-links** — link warnings that point to isolated or noisy
   pages.
4. **Thin documents** — outline sections with very low word counts.
5. **Block-less documents** — \`blocks.byName\` empty where sibling documents
   use blocks; structure (steps, callouts, comparisons, faq) may be missing.
6. **Missing or inconsistent frontmatter** compared to sibling documents.
7. **Structural imbalance** — skipped heading levels, single-section walls of text.

## Report

Report findings per file with concrete suggestions, ordered by priority. Do not
edit files during the audit. To fix a finding, follow the contentbit-author
skill (fetch the guide, edit, validate until clean) — offer that as a follow-up.
`

const AGENTS_MD_BLOCK = `<!-- contentbit:start -->

## contentbit content (generated — edits inside this block are overwritten)

This project validates Markdown content with contentbit. Documents are plain
Markdown plus directive blocks (\`:::name{props} ... :::\`), each with a schema.
The \`content:check\` script in package.json holds the canonical validate
command — the content glob plus any \`--registry\` and \`--no-generic-blocks\`
flags — reuse its arguments.
If the project has a \`content:links\` script, use it to build the internal-link
index; otherwise run \`contentbit links <content glob>\`.

When writing or editing content:

1. Fetch the live authoring guide first — never guess block syntax:
   \`contentbit instructions --audience llm [--registry <path>] [--no-generic-blocks]\`
2. Write plain Markdown; use blocks where the guide's use-when guidance fits.
3. If sibling documents use \`slug\` / \`linksTo\`, read
   \`.contentbit/link-index.json\` from \`contentbit links <content glob>\` and
   author frontmatter links with existing slugs. When creating a linked page,
   include \`keywords.primary\` and \`keywords.secondary\` with search-intent
   phrases future agents can use to choose related pages.
4. Validate until clean (exit 0): \`contentbit validate <file> [--registry <path>] [--no-generic-blocks]\`.
   Diagnostics print as \`file:line:col severity CODE message\` with fix hints.
   For link frontmatter, validate the full content glob so cross-file checks run.

When auditing content health:

- \`contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks]\` prints a ranked,
  read-only repair plan: validation issues, link issues, thin sections,
  block-less long documents, and missing image alt text.
- \`contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks] --json\` prints the
  same findings as structured JSON for agents and CI.
- \`contentbit stats "content/**/*.md" [--registry <path>] [--no-generic-blocks]\` prints raw JSON
  stats: outline word counts, block usage, link domains, and validation
  error/warning counts.
- \`contentbit links "content/**/*.md" [--fix]\` builds
  \`.contentbit/link-index.json\`, reports dangling links/orphans, and rewrites
  alias references in \`linksTo\` when \`--fix\` is used.

If \`contentbit\` is unavailable, suggest \`npx contentbit@latest init\` instead
of inventing block syntax.

<!-- contentbit:end -->`

const START = '<!-- contentbit:start -->'
const END = '<!-- contentbit:end -->'

/** Insert or replace the fenced contentbit block, leaving the rest untouched. */
function upsertBlock(existing: string): string {
  const start = existing.indexOf(START)
  const end = existing.indexOf(END)
  if (start !== -1 && end !== -1) {
    return existing.slice(0, start) + AGENTS_MD_BLOCK + existing.slice(end + END.length)
  }
  if (existing.trim() === '') return `${AGENTS_MD_BLOCK}\n`
  return `${existing.replace(/\n*$/, '\n\n')}${AGENTS_MD_BLOCK}\n`
}

export interface AgentOptions {
  /** Install Claude Code skills; defaults to detecting a .claude/ directory. */
  claude?: boolean
  /** Manage the AGENTS.md block; defaults to true. */
  agentsMd?: boolean
}

/** Install or refresh the agent integration. Shared by `agents` and `init`. */
export async function installAgentIntegration(
  cwd: string,
  options: AgentOptions,
  io: Io,
): Promise<void> {
  const claude = options.claude ?? existsSync(join(cwd, '.claude'))
  const agentsMd = options.agentsMd ?? true

  if (agentsMd) {
    const path = join(cwd, 'AGENTS.md')
    let existing = ''
    try {
      existing = await readFile(path, 'utf8')
    } catch {
      /* not there yet */
    }
    const created = existing === ''
    await writeFile(path, upsertBlock(existing), 'utf8')
    io.stdout(`${created ? 'created' : 'updated'}: AGENTS.md (contentbit block)`)
  }

  if (claude) {
    const skills: Array<[string, string]> = [
      ['contentbit-author', AUTHOR_SKILL],
      ['contentbit-audit', AUDIT_SKILL],
    ]
    for (const [name, content] of skills) {
      const dir = join(cwd, '.claude/skills', name)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'SKILL.md'), content, 'utf8')
      io.stdout(`installed: .claude/skills/${name}/SKILL.md`)
    }
  }
}

export async function agentsCommand(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      claude: { type: 'boolean', default: false },
      'no-agents-md': { type: 'boolean', default: false },
      cwd: { type: 'string', default: process.cwd() },
    },
  })
  await installAgentIntegration(
    values.cwd,
    {
      claude: values.claude || undefined, // false means "detect", not "skip"
      agentsMd: !values['no-agents-md'],
    },
    io,
  )
  return 0
}
