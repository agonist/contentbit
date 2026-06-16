---
slug: related-contentbit-workflows
linksTo:
  - dialing-in-espresso
keywords:
  primary: contentbit workflow
  secondary: [validation loop, internal links]
---

# Related contentbit workflows

This supporting page exists to show internal links in frontmatter. The link
graph is authored once with `slug` and `linksTo`, then contentbit derives
`linkedFrom` in `.contentbit/link-index.json`.

:::callout{type="note"}
Run `contentbit links "content/**/*.md" --fix` after renaming a page. Alias
references in `linksTo` are rewritten to the current slug, while `aliases`
stays as the rename record.
:::
