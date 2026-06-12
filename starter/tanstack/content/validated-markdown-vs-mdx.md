# Why validated Markdown beats MDX

MDX won by promising rich content: drop React components straight into your
prose and ship interactive docs. But that power comes with a coupling cost
that most content never needed. Validated Markdown — plain Markdown plus
schema-checked directive blocks — gets you the same rich output without
turning every document into source code.

:::callout{type="tldr"}
MDX makes content a compile target; a typo becomes a build failure. Validated
Markdown keeps content as data: portable across frameworks, checkable in CI,
and safe for non-developers and AI agents to edit.
:::

## Content as code vs content as data

An MDX file imports components, so it is code. It must be compiled by your
bundler, with your component library, in your framework. Move from Next.js to
Astro and every `<Callout>` import breaks. Hand a file to a writer and they
can crash the build with an unclosed tag.

Directive blocks invert this. `:::callout{type="tip"}` is inert text with a
schema. The renderer decides what it becomes — React today, something else
tomorrow — and a validator tells you exactly what's wrong before anything
builds.

:::comparison{left="Validated Markdown" right="MDX"}
- Failure mode | Lint-style diagnostic with a hint | Runtime or build crash
- Portability | Any framework with a renderer | Bound to your JSX setup
- Who can edit | Writers, agents, anyone | Developers, mostly
- Tooling needed | A CLI validator | Bundler + component library
:::

## Errors you can act on

The real difference shows up when something is wrong. An MDX error is a stack
trace pointing at compiled output. A validation error is a diagnostic pointing
at your file:

```
content/post.md:12:1 error UNKNOWN_PROP unknown prop "titel" on callout
  hint: did you mean "title"?
```

That precision is what makes the format safe to automate. A CI job — or an AI
agent writing content — can run the validator, read the diagnostic, fix the
line, and re-run until clean. There is no equivalent loop for "the build
failed somewhere inside your MDX."

## The trade-off, honestly

:::pros-cons
+ Content survives framework migrations untouched
+ Schema errors caught before merge, with line numbers
+ Non-developers and agents can author safely
- No arbitrary inline components — you get the registered blocks
:::

If your page genuinely needs bespoke interactive widgets in the middle of
prose, that's an app screen, and JSX is the right tool. For everything else —
posts, docs, guides, changelogs — validated Markdown gives you the rich
blocks without the build coupling. Write text, validate it, render it
anywhere.
