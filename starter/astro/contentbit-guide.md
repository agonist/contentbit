# Content block authoring rules

- write regular Markdown by default; use blocks only when they improve scanning or structure
- never invent block names — only the blocks documented below exist
- follow each block's syntax exactly; props use {key="value"} on the open line
- close every :::block with a line containing only :::
- validate generated content and fix diagnostics rather than bypassing them


## callout

Highlighted note, tip, warning, important, or TLDR box.

Content: Markdown body

Use when:
- Practical advice that prevents a common mistake (tip)
- Context the reader must not miss (note/important)
- Something that ruins the result if ignored (warning)
- A 1-3 sentence summary at the top of a section (tldr)

Avoid when:
- Regular prose that is not a standout remark
- More than one callout in the same section
- Content longer than ~3 sentences

Example:

```md
:::callout{type="tip" title="Worth knowing"}
Always weigh flour — volume measures drift by 20%.
:::
```

## steps

Ordered process steps with visual numbering.

Content: Ordered list: `1. item`

Use when:
- Sequential processes where order matters
- 3+ steps that benefit from numbering

Avoid when:
- Unordered tips — use a bullet list
- A single step — write it in prose

Example:

```md
:::steps
1. Combine flour and water
2. Rest 20 minutes
3. Add salt and mix
:::
```

## key-metrics

Scannable stat cards: a large value with a short label.

Content: List rows: `- value | label`

Use when:
- Surfacing 2-8 numbers the reader should remember
- Replacing a stats paragraph

Avoid when:
- Values without a clear unit or context
- Long textual descriptions

Example:

```md
:::key-metrics
- 42% | Conversion lift
- 18ms | Median parse time
:::
```

## quick-ref

Compact key/value reference card.

Content: List rows: `- key | value`

Use when:
- Facts a reader will return to (temperatures, ratios, durations)
- At-a-glance summaries near the top of a guide

Avoid when:
- Narrative content
- Comparing options — use comparison instead

Example:

```md
:::quick-ref
- Hydration | 65%
- Proof time | 2h at 24°C
:::
```

## comparison

Side-by-side comparison of exactly two options.

Content: List rows: `- label | left | right`

Use when:
- Comparing exactly two things across attributes
- Replacing a two-column Markdown table

Avoid when:
- Comparing more than two things
- Only one row of comparison

Example:

```md
:::comparison{left="Option A" right="Option B"}
- Speed | Fast | Slow
- Setup | Simple | Advanced
:::
```

## pros-cons

Paired advantages (+) and disadvantages (-) of one option.

Content: Signed list: `+ positive` / `- negative`

Use when:
- Evaluating a single option's trade-offs
- Summarizing a review

Avoid when:
- Comparing two options — use comparison
- Only positives or only negatives

Example:

```md
:::pros-cons
+ Cheap to run
+ Fast setup
- No offline mode
:::
```

## tabs

Tabbed switcher for alternative methods or variants — the reader picks one.

Content: Child blocks: `::tab`

Use when:
- Two or more alternative methods for the same task
- Variants by equipment, audience, or budget

Avoid when:
- Side-by-side comparison — use comparison
- Sequential content — use steps

Example:

```md
:::tabs
::tab{title="Fast"}
Use this when time matters.
::tab{title="Cheap"}
Use this when budget matters.
:::
```

## tab

One tab panel with a title. (child block — only inside a parent that allows it)

Content: Markdown body

Use when:
- Only inside :::tabs

Avoid when:
- Anywhere outside :::tabs

Example:

```md
::tab{title="Stand Mixer"}
Use the dough hook on speed 2.
```

## faq

Frequently asked questions with expandable answers.

Content: Child blocks: `::faq-item`

Use when:
- Real questions readers ask about the topic
- End-of-article FAQ sections

Avoid when:
- Content that is not literally question/answer
- A single trivial question

Example:

```md
:::faq
::faq-item{question="Can I freeze it?"}
Yes, up to 3 months.
:::
```

## faq-item

One question/answer pair. (child block — only inside a parent that allows it)

Content: Markdown body

Use when:
- Only inside :::faq

Avoid when:
- Anywhere outside :::faq

Example:

```md
::faq-item{question="Can I freeze it?"}
Yes, up to 3 months.
```
