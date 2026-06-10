---
title: Why LLMs write broken Markdown — and how to make it impossible
description: LLMs are fluent in Markdown, and that fluency is exactly the problem. The fix is not a better prompt. It is a contract the output cannot escape.
date: 2026-06-10
---

Ask a model for an article and you get beautiful Markdown back — headings in
the right order, lists that parse, confident formatting everywhere. That
fluency is exactly the problem. The output *looks* publishable, so it ships,
and the failures only surface in production: a component name that does not
exist, a table with a missing column, an unclosed tag swallowing half the page.

:::callout{type="tldr"}
You cannot prompt your way to reliable generated content. You need a closed
loop: a constrained syntax the model writes, a validator that rejects bad
output with precise errors, and instructions generated from the same schema
that does the rejecting.
:::

## The failure modes are always the same

Run an LLM content pipeline for a week and you will meet all of these:

- **Invented components.** Ask for "use our Callout component" and sooner or
  later you get `<Warning>`, `<Note>`, or `<Callout2>` — fluent hallucination.
- **Prop drift.** The component takes `type="warning"`; the model writes
  `variant="warn"`. Nothing crashes. The styling silently disappears.
- **Structural near-misses.** A comparison table with two cells in one row and
  three in the next. Markdown renders it anyway — wrong.
- **The prompt and the code disagree.** Someone refactors a component, nobody
  updates the system prompt, and every article generated after that day is
  subtly broken.

None of these are model failures. They are interface failures: free-form
markup is an interface with no contract.

## Hope is not a pipeline

The difference between the two approaches is not subtle:

:::comparison{left="Prompt and hope" right="Validated contract"}
- Output format | Whatever the model felt like | Constrained block syntax
- Bad output | Ships, breaks in production | Rejected before render
- Error feedback | A user screenshot | file:line:col + a fix hint
- Prompt accuracy | Drifts from the code | Generated from the schema
:::

The right column is what Content Blocks does. Authors — human or model — write
plain Markdown with directive blocks:

```md
:::callout{type="warning" title="The rim is sacred"}
Never flatten the outer 2cm of the dough.
:::
```

Every block has a schema. Validation runs before anything renders, and a
violation produces a diagnostic a machine can act on:

```text
article.md:12:1 error CB_PROPS_INVALID
:::callout props invalid: type must be one of note|tip|warning|important|tldr.
hint: Did you mean type="warning"?
```

## Close the loop

The part that makes this work for *generated* content: the same registry that
validates the output also writes the model's instructions. Schema, docs, and
prompt cannot drift apart, because they are one artifact.

:::steps
1. Generate the authoring guide from your registry — `contentbit instructions --audience llm` — and put it in the system prompt.
2. Let the model write plain Markdown with blocks. No JSX, no HTML, nothing executable.
3. Validate the output — `contentbit validate` exits 1 with file:line:col diagnostics.
4. Feed the diagnostics back to the model and let it repair its own output. Loop until clean.
5. Render anywhere: React, static HTML, or plain Markdown for email and search indexes.
:::

Step four is the quiet superpower. A diagnostic like `CB_ROW_COLUMNS … Found 2,
expected 3` with a hint attached is something a model fixes correctly on the
first retry, almost every time. You stop reviewing generated markup and start
reviewing content.

## Questions we keep getting

:::faq
::faq-item{question="Isn't this just a linter?"}
A linter warns about style in code a human will review. This is a validator
that *gates rendering* — invalid content never reaches your users, and the
errors are designed to be consumed by the model that wrote them, not by you.
::faq-item{question="Why not just use MDX?"}
MDX executes code, which is precisely what you do not want from generated
content. Blocks are data: a constrained grammar, no expressions, no imports,
parseable and validatable without running anything.
::faq-item{question="What happens to content if I drop the renderer?"}
It stays readable. A Content Blocks document is still plain Markdown — strip
the blocks and the text underneath makes sense in any editor, forever.
:::

This article is itself a Content Blocks document — hit **Source** above to see
the Markdown it was written in, or **Plain Markdown** to see the fallback
rendering. The [playground](/playground) validates as you type if you want to
break things yourself.
