---
name: contentbit-author
description: |
  Write or edit contentbit Markdown content (directive blocks like :::callout).
  Use when asked to create or modify content documents in a project that uses
  contentbit — blog posts, docs pages, changelogs, any Markdown covered by
  `contentbit validate`.
version: 1
---

# Writing contentbit content

contentbit documents are plain Markdown plus directive blocks
(`:::name{props} ... :::`). Every block has a schema. Never guess block names,
props, or body shapes — fetch the live guide from the project's registry first.

## Find the project conventions

Check `package.json` for a `content:check` script. It holds the canonical
validate invocation for this project: the content glob and, if present, the
`--registry <path>` flag pointing at custom block definitions. Reuse both
below. No script? Default to `content/**/*.md` with no `--registry` flag.

## The loop

1. **Fetch the authoring guide** (always — it covers this project's custom blocks):

   ```sh
   contentbit instructions --audience llm [--registry <path from content:check>]
   ```

   Read it before writing. It documents every available block: props, body
   shape, and when to use or avoid it.

2. **Write the document.** Plain Markdown everywhere; blocks only where the
   guide's use-when guidance fits. Keep frontmatter consistent with sibling
   documents in the same folder.

3. **Validate and fix until clean:**

   ```sh
   contentbit validate <file> [--registry <path>]
   ```

   Diagnostics print to stderr as `file:line:col severity CODE message`, often
   with a `hint:` line suggesting the fix. Exit 0 means clean; exit 1 means
   errors remain. Fix every diagnostic and re-run. Never finish with a failing
   validate.

## Failure modes

- `contentbit` not found or no registry resolvable: the project is not set up.
  Say so and suggest `npx contentbit@latest init` — do not invent block syntax.
- A block you want does not exist: use plain Markdown, or ask whether to define
  a custom block in the registry. Never emit an unregistered block name.
