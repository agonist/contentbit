---
title: contentbit 0.3.0 — internal links your content can't outgrow
description: Author each page's place in the graph in frontmatter; contentbit derives backlinks, validates every reference, and heals renames with --fix. Internal linking that fails CI instead of your readers.
date: 2026-06-24
slug: contentbit-0-3-0
linksTo:
  - contentbit-0-2-0
keywords:
  primary: internal linking for content
  secondary: [contentbit links, backlinks, broken link validation, content graph]
---

Every content site has a link graph whether you manage it or not. Posts
reference other posts. A "related reading" list points three ways. Then someone
renames a page, and four older articles quietly start pointing at nothing. The
graph is real; nothing checks it. Broken internal links don't crash a build.
They degrade, one rename at a time, until a reader hits a 404 you shipped six
months ago.

0.3.0 makes that graph something you can validate. You author each page's place
in it once, in frontmatter, and contentbit handles the bookkeeping: it works out
the backlinks for you, rejects links to slugs that don't exist, and fixes stale
references after a rename.

:::callout{type="tldr"}
0.3.0 adds `contentbit links`: build `.contentbit/link-index.json` from
frontmatter `slug`, `linksTo`, `aliases`, and `keywords`, with derived
`linkedFrom` backlinks. `contentbit validate` now checks links automatically
when files declare a slug, `--fix` heals renamed-slug references, and four
resolver modes handle multilingual sites. Your LLM agent picks existing slugs
from the graph instead of guessing.
:::

## Links are content, not markup

An internal link is metadata about a page, not something you hand-write into the
body. You don't sprinkle absolute URLs through your prose and hope they survive
the next route refactor. You declare the relationship in frontmatter, and the
renderer builds the URL however it wants to.

```yaml
---
slug: dialing-in-espresso
linksTo:
  - grinder-setting-notes
  - espresso-recipe-log
aliases:
  - espresso-dial-in
keywords:
  primary: espresso dial in guide
  secondary: [coffee recipe, extraction workflow]
---
```

Four keys live in your source files: `slug`, `linksTo`, `aliases`, and
`keywords`. Everything else is derived. You never write `linkedFrom` yourself —
contentbit inverts the `linksTo` edges to figure out who points at each page.
Move the post, swap its route helper, translate it; the relationship still
holds, because it was never pinned to a URL to begin with.

## One command builds the graph

```sh
contentbit links "content/**/*.md"
```

This reads every file's frontmatter, resolves aliases, derives backlinks, and
writes a small, stable JSON index:

```json
{
  "pages": [
    {
      "slug": "dialing-in-espresso",
      "title": "Dialing in espresso",
      "linksTo": ["grinder-setting-notes", "espresso-recipe-log"],
      "linkedFrom": ["espresso-recipe-log"],
      "aliases": ["espresso-dial-in"],
      "keywords": { "primary": "espresso dial in guide" }
    }
  ],
  "aliases": { "espresso-dial-in": "dialing-in-espresso" }
}
```

The `linkedFrom` array is where this pays off. It's a "related reading" section
you never touch by hand. The starters render exactly that: their `/blog` route
lists each post's backlinks straight from frontmatter. The index file is for the
other kind of consumer — a pipeline or an LLM agent that wants the whole graph
in one read before it writes a new page.

## Broken references fail validation

A graph is only worth having if something checks it. `contentbit validate` now
runs the link checks for you whenever a matched file declares a `slug`. Same
`file:line:col` diagnostics as block validation, same exit code, same loop:

```text
content/grinder-setting-notes.md:4:3 error CB_LINK_UNRESOLVED
linksTo target "dialing-in-esspresso" matches no slug or alias.
hint: Did you mean "dialing-in-espresso"?
```

A typo'd slug, two pages claiming the same slug, an alias that collides with a
real page, a link left dangling after a rename: each one stops the build with a
specific line and a fix hint instead of reaching a reader.

:::comparison{left="Hand-managed links" right="contentbit links"}
- Backlinks | Maintained by hand, drift immediately | Derived on every run
- A renamed page | Silent 404s in old posts | `CB_LINK_UNRESOLVED`, fails CI
- Finding broken links | A reader's bug report | One command, before merge
- Source of truth | URLs scattered through prose | `slug` + `linksTo` in frontmatter
:::

## Renames heal themselves

Renaming a page is where link graphs usually rot. Here it's a two-step move.
Keep the old slug as an alias on the page that changed:

```yaml
---
slug: cold-fermentation-pizza
aliases:
  - overnight-pizza-dough
---
```

Then let `--fix` rewrite every stale outbound reference to the new slug:

```sh
contentbit links "content/**/*.md" --fix
```

`--fix` is intentionally timid. It only rewrites values inside `linksTo` that
point at a known alias. It won't delete your aliases, invent related pages,
touch a word of body Markdown, or write derived data back into source. The
rename propagates and nothing else moves.

## Multilingual, without a separate tool

If you run more than one locale, pick the resolver mode that matches your URL
model. Global slugs, slugs scoped per locale, or stable content `key`s paired
with locale-specific slugs are all covered:

:::steps
1. Pick a mode: `--link-resolve global-slug` (default), `same-locale-slug`, `same-locale-key`, or `prefer-same-locale-key-fallback-slug`
2. For translated slugs, give each page a stable `key` and a locale-specific `slug`
3. Link by `key`; the index keeps locale, slug, and key together so your app builds `/{locale}/blog/{slug}` with its own route helper
:::

Point a link across locales on purpose and you get a warning rather than a
silent edge, so the cross-locale jump shows up in review.

## Your agent reads the graph

This is where it meets the [0.2.0 agent
workflow](/blog/contentbit-0-2-0). The `contentbit agents` integration now
teaches skills and `AGENTS.md` to load the link index before writing, so an LLM
agent picks `linksTo` values from slugs that actually exist instead of inventing
a plausible-looking one. The same loop that keeps blocks valid now keeps the
graph honest:

:::steps
1. Run `contentbit links` to read current slugs, aliases, and backlinks
2. Write the page, choosing `linksTo` from real slugs in the index
3. Run `contentbit links --fix` if aliases changed
4. Validate until clean — broken links are diagnostics, not surprises
:::

## Common questions

:::faq
::faq-item{question="Do I have to add slugs to every file?"}
No. Link checks only run for files that declare a `slug`. Pages without one are
ignored by the linker and validate exactly as before.
::faq-item{question="Is the link index something I commit?"}
It's generated, like a lockfile — commit it if a pipeline or your renderer reads
it, or regenerate it in CI. Either way it's derived from frontmatter, so it
never disagrees with your source.
::faq-item{question="What if I just want backlinks in my UI?"}
Parse the frontmatter and invert `linksTo` yourself — the starters ship a
~5-line `linkedFromFor()` helper. The JSON index is for whole-graph consumers
like agents and pipelines.
:::

The terse version of all this lives in the [changelog](/docs/changelog). The
full reference, with every diagnostic code, every resolver mode, and the exact
`--fix` rules, is in the [internal linking
guide](/docs/guides/internal-linking).

:::callout{type="note" title="Written under its own rules"}
This post is a contentbit document, and its frontmatter links to the 0.2.0
announcement, so it's a node in the graph it's describing. The callouts, steps,
comparison, and FAQ are all directive blocks, validated by the same pipeline
this post announces. Try breaking one in the [playground](/playground).
:::
