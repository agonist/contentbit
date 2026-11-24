---
'@contentbit/core': patch
'contentbit': patch
---

Fix false findings and lost pages in parsing, integrity, and SEO checks:

- A line that starts with inline code such as "```js``` here" no longer opens a
  code fence, and a fence line with an info string no longer closes one.
- Heading anchors match the ids renderers emit (github-slugger), so accented
  anchors and headings with inline code resolve. Heading outline text keeps
  inline code.
- Links to the site root are no longer reported as unresolved routes.
- Configured `slugField`, `keyField`, and `localeField` win over the canonical
  names in page facts, and integrity checks such as the missing H1 read page
  identity through page facts.
- SEO `requiredFrontmatter` treats empty strings and `null` as missing.
- SEO pages that share an id are both kept, with a `CB_SEO_PAGE_ID_DUPLICATE`
  warning, and localized files with a planned page's key replace that plan.
