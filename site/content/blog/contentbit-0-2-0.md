---
title: contentbit 0.2.0 — your coding agent writes validated content
description: One command installs agent skills that fetch the live authoring guide, write, and validate until clean. Plus document stats, an Astro renderer, and fully documented props.
date: 2026-06-12
slug: contentbit-0-2-0
linksTo:
  - llm-markdown-that-cannot-break
keywords:
  primary: coding agent content workflow
  secondary: [contentbit agents, content validation, document stats]
---

0.1.0 gave you the contract: every block has a schema, validation runs before
anything renders, and bad output gets rejected with a `file:line:col`
diagnostic and a fix hint. That closed the loop in principle. In practice,
someone still had to run it — fetch the guide, write, validate, fix, repeat.

0.2.0 ships the operator. Your coding agent already lives in your repo; now
one command teaches it to run the whole loop itself.

:::callout{type="tldr"}
0.2.0 adds `contentbit agents` (Claude Code skills + `AGENTS.md` instructions,
installed by `init`), `contentbit stats` for auditing content as JSON, a
renderer-only `@contentbit/astro` package, and authoring guides that document
every prop. All packages now share one version number.
:::

## Your agent, wired in

```sh
npx contentbit@latest agents
```

This manages a fenced instruction block in `AGENTS.md` (read by Cursor,
Codex, Copilot, and friends) and, when a `.claude/` directory exists, installs
two Claude Code skills. `contentbit init` runs it automatically, so new
projects get all of this for free.

Ask for "a blog post about X" and the `contentbit-author` skill runs the loop
a careful human would:

:::steps
1. Fetch the live authoring guide: `contentbit instructions --audience llm`
2. Write plain Markdown, using blocks where the guide's guidance fits
3. Validate: `contentbit validate <file>`
4. Fix every diagnostic — exact line, stable code, fix hint
5. Stop only at exit 0
:::

The design decision that makes this hold up: the skills contain no block
schemas. Nothing about your blocks is copied into the skill files. The skills
read everything from the CLI at runtime, so when you add a custom block to
your registry, every agent picks it up on the next run. There is nothing to
regenerate, and the prompts can never drift from the code. That drift is the
failure mode this library was built to prevent.

## Stats: audit without opening a file

The second skill, `contentbit-audit`, leans on the other new command. `stats`
analyzes documents and prints JSON — heading outlines with per-section word
counts, block usage, link domains, and a validation summary:

```sh
contentbit stats "content/**/*.md"
```

```json
{
  "file": { "path": "content/getting-started.md", "lines": 102 },
  "length": { "words": 601, "readingMinutes": 4 },
  "outline": [
    { "level": 2, "text": "Getting started", "line": 20, "words": 127 },
    { "level": 2, "text": "Deployment", "line": 37, "words": 2 }
  ],
  "blocks": { "total": 7, "byName": { "callout": 1, "steps": 1 } },
  "validation": { "errors": 0, "warnings": 0 }
}
```

That two-word "Deployment" section is a stub, and you found it without opening
the file. Now multiply by every document in the directory:

:::comparison{left="Eyeballing content" right="contentbit stats"}
- Finding thin pages | Open every file | Sort by section word count
- Validation coverage | Whatever you remember to check | Every file, every run
- Spotting missing structure | Gut feeling | Empty blocks.byName, flagged
- Cost of a full audit | An afternoon | One command and some jq
:::

`analyzeDocument` is also a plain export from `@contentbit/core` — pure,
environment-agnostic, no filesystem — if you'd rather build your own tooling
on it.

## Astro, the renderer-only way

`@contentbit/astro` renders validated documents with `.astro` components,
including per-block overrides where validated props arrive as component props
and nested content arrives via `<slot />`.

What it deliberately doesn't include: a content-loader integration. Astro's
own content collections load your Markdown, contentbit validates it where it
renders, and `contentbit validate` covers the same files in CI. One validation
path beats two that can disagree. And since static pages render at build time,
an invalid block fails the build before it can reach a reader.

## Every prop, documented

Generated authoring guides now document every prop from the block's schema:
name, type with enum values spelled out, required or optional, default value,
and the schema's `.describe()` text.

Before, props were only visible through examples — so an agent obeying "never
guess props" had no way to discover an optional prop the example didn't use.
Now the rule is satisfiable. If you define custom blocks, this is
your nudge to `.describe()` their props: your agent reads those descriptions.

## One version number

This is the first synchronized release — every package moves to 0.2.0
together, and will move together from here on. Upgrading is one command, and
existing projects can refresh their agent integration with
`npx contentbit@latest agents`. The terse version of all of the above lives in
the new [changelog](/docs/changelog).

:::callout{type="note" title="Written under its own rules"}
This post is a contentbit document: the callouts, steps, and the comparison
table above are directive blocks, validated by the same pipeline it announces.
Try breaking one in the [playground](/playground).
:::
