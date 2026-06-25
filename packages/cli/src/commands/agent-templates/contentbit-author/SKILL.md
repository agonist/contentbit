---
name: contentbit-author
description: |
  Write or edit contentbit Markdown content (directive blocks like :::callout).
  Use when asked to create or modify content documents in a project that uses
  contentbit — blog posts, docs pages, changelogs, any Markdown covered by
  `contentbit validate`.
version: 4
---

# Writing contentbit content

contentbit documents are plain Markdown plus directive blocks
(`:::name{props} ... :::`). Every block has a schema. Never guess block names,
props, or body shapes — fetch the live guide from the project's registry first.

## Find the project conventions

Check `package.json` for a `content:check` script. It holds the canonical
validate invocation for this project: the content glob and, if present, the
`--registry <path>` and `--no-generic-blocks` flags. Reuse those arguments
below. No script? Default to `content/**/*.md` with no `--registry` flag.
If the project has a `content:links` script, use it for the internal-link
index; otherwise run `contentbit links <content glob>` directly.

## The loop

1. **Fetch the authoring guide** (always — it covers this project's custom blocks):

   ```sh
   contentbit instructions --audience llm [--registry <path from content:check>] [--no-generic-blocks]
   ```

   Read it before writing. It documents every available block: props, body
   shape, and when to use or avoid it.

2. **Write the document.** Plain Markdown everywhere; blocks only where the
   guide's use-when guidance fits. Keep frontmatter consistent with sibling
   documents in the same folder. If sibling documents use `slug`, `linksTo`,
   `aliases`, or `keywords`, run the link index first:

   ```sh
   contentbit links <content glob>
   ```

   Read `.contentbit/link-index.json` to pick existing slugs and related
   pages. Author only `slug`, `linksTo`, `aliases`, and `keywords` in
   frontmatter; never write derived `linkedFrom` into source files. When
   creating a linked page, include `keywords.primary` and
   `keywords.secondary` with search-intent phrases that would help future
   agents choose this page as a `linksTo` target.

3. **Validate and fix until clean:**

   ```sh
   contentbit validate <file> [--registry <path>] [--no-generic-blocks]
   ```

   Diagnostics print to stderr as `file:line:col severity CODE message`, often
   with a `hint:` line suggesting the fix. Exit 0 means clean; exit 1 means
   errors remain. If the document has link frontmatter, validate the full
   content glob so cross-file links are checked against the whole graph. Fix
   every diagnostic and re-run. Never finish with a failing validate.

4. **Refresh internal links when present:**

   ```sh
   contentbit links <content glob> --fix
   ```

   `--fix` only rewrites `linksTo` values that point at known aliases. It
   does not invent links, remove aliases, or write backlinks. Re-run validate
   after it changes files.

## Failure modes

- `contentbit` not found or no registry resolvable: the project is not set up.
  Say so and suggest `npx contentbit@latest init` — do not invent block syntax.
- A block you want does not exist: use plain Markdown, or ask whether to define
  a custom block in the registry. Never emit an unregistered block name.
