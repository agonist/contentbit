# Locale-Aware Internal Linking

Status: draft
Owner: contentbit
Date: 2026-06-23

## Problem

`contentbit links` currently treats `slug` as a single global identifier. That is
enough for one-language sites, but multilingual projects need the same internal
link graph to resolve within the current language. A French page should prefer
French targets, an English page should prefer English targets, and validation
should catch missing translated targets without forcing every project to adopt a
single content model.

The feature must stay simple for existing projects. A one-language site should
continue to author:

```yaml
---
slug: beginner-pizza-dough
linksTo:
  - cold-fermentation-pizza
---
```

Multilingual sites should be able to opt into locale-aware behavior without
making normal frontmatter noisy.

## Goals

- Preserve the current single-locale behavior by default.
- Support localized slugs, where each language has its own route slug.
- Support stable cross-locale content keys for projects that want translation
  parity checks.
- Keep `linksTo` author-friendly. Most pages should still use string values.
- Resolve backlinks per locale when locale data is present.
- Scope duplicate-slug and alias-conflict checks by locale when configured.
- Make missing translations visible through diagnostics.
- Keep `.contentbit/link-index.json` stable and easy for agents to consume.

## Non-Goals

- Rendering localized URLs in body Markdown.
- Managing translation workflows or machine translation.
- Requiring every project to define locales.
- Requiring all multilingual projects to use stable translation keys.
- Replacing site-router logic. Contentbit validates and indexes metadata.

## Frontmatter

The base fields remain supported:

```yaml
---
slug: pizza-dough
linksTo:
  - cold-fermentation
aliases:
  - old-pizza-dough
keywords:
  primary: pizza dough guide
---
```

Locale-aware projects may add:

```yaml
---
locale: fr
slug: pate-a-pizza
key: pizza-dough
linksTo:
  - fermentation-a-froid
aliases:
  - ancienne-pate-a-pizza
---
```

Field meanings:

- `locale`: optional locale code, such as `en`, `fr`, or `es`.
- `slug`: local route slug or global slug.
- `key`: optional stable content identity shared by translations.
- `linksTo`: string targets interpreted by the configured resolver mode.
- `aliases`: previous target strings, scoped the same way as the target they
  replace.
- `keywords`: unchanged, still copied to the index for agent context.

`key` is intentionally short. Projects that prefer a more explicit field name
can configure `keyField: "translationKey"`.

## Configuration

Add optional link configuration. Exact file discovery can follow the existing
contentbit config story when one exists. Until then, CLI flags or package-script
defaults can pass it through.

```json
{
  "links": {
    "localeField": "locale",
    "slugField": "slug",
    "keyField": "key",
    "defaultLocale": "en",
    "fallbackLocale": "en",
    "resolve": "global-slug"
  }
}
```

Resolver modes:

- `global-slug`: current behavior. `slug` and `aliases` are global.
- `same-locale-slug`: `linksTo` strings resolve to `slug` or `aliases` in the
  source page's locale.
- `same-locale-key`: `linksTo` strings resolve to `key` or key aliases in the
  source page's locale.
- `prefer-same-locale-key-fallback-slug`: try `(locale, key)` first, then
  `(locale, slug)`. This helps projects migrate from localized slugs to stable
  keys.

Default mode is `global-slug` to avoid breaking existing projects.

## Explicit Targets

String targets should cover the common case. Object targets can support rare
exceptions without changing the resolver mode:

```yaml
linksTo:
  - fermentation-a-froid
  - key: pizza-flour-guide
  - locale: en
    slug: sourdough-pizza
```

Resolution rules:

- A string target uses the configured resolver mode.
- `{ slug }` resolves by slug, using source locale unless `locale` is provided.
- `{ key }` resolves by key, using source locale unless `locale` is provided.
- `{ locale, slug }` may intentionally cross-link to another locale.
- `{ locale, key }` resolves a translated page by stable key.

Object targets are optional. They are for migrations, deliberate cross-locale
links, and advanced sites.

## Index Model

Internally, build indexes by multiple identities:

```ts
interface LinkIdentity {
  locale?: string
  slug: string
  key?: string
}

interface LinkIndexInternal {
  bySlug: Map<string, IndexedPage[]>
  byLocaleSlug: Map<string, IndexedPage>
  byKey: Map<string, IndexedPage[]>
  byLocaleKey: Map<string, IndexedPage>
  aliasesBySlug: Map<string, LinkIdentity>
  aliasesByLocaleSlug: Map<string, LinkIdentity>
  aliasesByKey: Map<string, LinkIdentity>
  aliasesByLocaleKey: Map<string, LinkIdentity>
}
```

Composite keys use a delimiter that cannot appear in normalized locale values,
for example `${locale}\0${slug}`.

Serialized JSON should stay plain and stable:

```json
{
  "pages": [
    {
      "slug": "pate-a-pizza",
      "locale": "fr",
      "key": "pizza-dough",
      "path": "/repo/content/fr/pate-a-pizza.md",
      "linksTo": [
        {
          "target": "fermentation-a-froid",
          "locale": "fr",
          "slug": "fermentation-a-froid",
          "key": "cold-fermentation"
        }
      ],
      "linkedFrom": [
        {
          "locale": "fr",
          "slug": "farine-pizza",
          "key": "pizza-flour"
        }
      ],
      "aliases": ["ancienne-pate-a-pizza"]
    }
  ],
  "aliases": {
    "fr:ancienne-pate-a-pizza": {
      "locale": "fr",
      "slug": "pate-a-pizza",
      "key": "pizza-dough"
    }
  }
}
```

For `global-slug`, keep the current compact string arrays for backward
compatibility unless a locale or key is present.

## Validation

Existing diagnostics remain:

- `CB_LINK_UNRESOLVED`
- `CB_SLUG_DUPLICATE`
- `CB_ALIAS_CONFLICT`
- `CB_LINK_SELF`
- `CB_LINK_ORPHAN`

Add locale-aware diagnostics:

- `CB_LINK_LOCALE_MISSING`: target exists globally or in another locale, but not
  in the source locale.
- `CB_LINK_CROSS_LOCALE`: object target intentionally resolves to another
  locale. Warning by default, configurable.
- `CB_KEY_DUPLICATE`: same `key` appears twice in one locale.
- `CB_KEY_MISSING`: resolver mode needs `key`, but a participating page omits it.
- `CB_LOCALE_INVALID`: locale field is not a non-empty string.

Validation semantics by mode:

### global-slug

- Current behavior.
- Duplicate `slug` is global.
- Alias conflicts are global.
- Orphans are global.

### same-locale-slug

- Duplicate `slug` is an error only within the same locale.
- Duplicate alias is an error only within the same locale.
- `linksTo` resolves to `(source.locale, targetSlugOrAlias)`.
- If target exists in another locale but not the source locale, emit
  `CB_LINK_LOCALE_MISSING`.
- Orphans are computed per locale.
- Pages without `locale` use `defaultLocale` if configured. Otherwise they are
  treated as locale-less and resolve only against locale-less pages.

### same-locale-key

- Every participating page should have `key`; missing key is
  `CB_KEY_MISSING`.
- Duplicate `(locale, key)` is `CB_KEY_DUPLICATE`.
- `linksTo` resolves to `(source.locale, targetKeyOrAlias)`.
- If key exists in another locale but not source locale, emit
  `CB_LINK_LOCALE_MISSING`.
- Slug duplicates are still checked per locale.

### prefer-same-locale-key-fallback-slug

- If source page has a locale, first resolve string targets as
  `(source.locale, keyOrAlias)`.
- If no key match exists, resolve as `(source.locale, slugOrAlias)`.
- Emit a migration warning when a target resolves by slug fallback and a same
  string key exists elsewhere.

## Alias Fixing

`contentbit links --fix` should respect the resolver mode.

Rules:

- Never run fixes when link validation has errors.
- In `global-slug`, keep current behavior.
- In `same-locale-slug`, rewrite only aliases in the source page's locale.
- In `same-locale-key`, rewrite key aliases to the current key.
- In fallback mode, rewrite only when the alias resolution is unambiguous.
- Never rewrite `aliases`, `key`, `slug`, body Markdown, or cross-locale object
  targets.

Example:

```yaml
---
locale: fr
slug: pate-a-pizza
linksTo:
  - ancienne-fermentation
---
```

If `ancienne-fermentation` is an alias for `fermentation-a-froid` in `fr`,
`--fix` rewrites only that French page:

```yaml
linksTo:
  - fermentation-a-froid
```

## Agent Workflow

Generated agent instructions should say:

- Run `contentbit links <glob>` before editing linked content.
- If the index has locales, choose targets from the same locale by default.
- If the project uses `key`, preserve the same `key` across translations.
- Do not invent localized slugs. Use slugs from the index.
- If a same-locale target is missing, either create the translated target or
  intentionally use an explicit cross-locale object target.
- Run `contentbit links <glob> --fix` only after validation errors are fixed.

## Migration

Phase 1: Current projects

- No config.
- No `locale`.
- Behavior is unchanged.

Phase 2: Localized slugs

```json
{
  "links": {
    "resolve": "same-locale-slug",
    "defaultLocale": "en"
  }
}
```

Pages add `locale`; `linksTo` stays local and author-friendly.

Phase 3: Stable keys

Projects add `key` to each translation group and switch to either
`same-locale-key` or `prefer-same-locale-key-fallback-slug`.

## Implementation Plan

1. Extend `LinkFrontmatter` parsing with optional `locale`, optional `key`, and
   optional object targets in `linksTo`.
2. Add `LinkResolverOptions` with `resolve`, field names, and locale defaults.
3. Refactor `buildLinkIndex` into collection and resolution passes.
4. Preserve the current serialized shape for `global-slug` output.
5. Add locale-aware serialized output only when locale or key data is present.
6. Update `validateLinks` to use resolver options.
7. Update `links --fix` to use resolved alias metadata instead of raw alias maps.
8. Update generated agent templates and public guide examples.

## Test Matrix

- Existing single-language fixtures remain unchanged.
- Duplicate slug is allowed across `en` and `fr` in `same-locale-slug`.
- Duplicate slug is rejected within `fr`.
- A French page linking to an English-only target emits
  `CB_LINK_LOCALE_MISSING`.
- Backlinks are derived only within the same locale by default.
- Object target `{ locale: "en", slug: "x" }` resolves cross-locale and emits
  `CB_LINK_CROSS_LOCALE`.
- `--fix` rewrites only same-locale alias references.
- `--fix` skips when duplicate aliases make resolution ambiguous.
- Fallback mode resolves by key first, then slug.
- Locale-less pages preserve current behavior in `global-slug`.

## Open Questions

- Should `CB_LINK_LOCALE_MISSING` be an error by default, or a warning unless
  `strict-warnings` is enabled?
- Should locale be inferred from path segments when frontmatter omits it?
- Should `key` be exposed in public docs immediately, or kept as advanced
  configuration?
- Should cross-locale links be allowed silently when explicit object targets are
  used?
