import { z } from 'zod'

import type { Diagnostic, SourceRange } from './diagnostics.js'

const Keywords = z.object({
  primary: z.string().optional(),
  secondary: z.array(z.string()).optional(),
})

const LinkTarget = z.union([
  z.string(),
  z
    .object({
      slug: z.string().min(1).optional(),
      key: z.string().min(1).optional(),
      locale: z.string().min(1).optional(),
    })
    .refine((target) => target.slug || target.key, {
      message: 'object linksTo targets must include slug or key',
    }),
])

const LinkFrontmatter = z.object({
  slug: z.string().min(1),
  key: z.string().min(1).optional(),
  locale: z.string().min(1).optional(),
  title: z.string().optional(),
  linksTo: z.array(LinkTarget).optional(),
  aliases: z.array(z.string()).optional(),
  keywords: Keywords.optional(),
})

export type LinkTarget = z.infer<typeof LinkTarget>
export type LinkFrontmatter = z.infer<typeof LinkFrontmatter>

export type LinkResolveMode =
  | 'global-slug'
  | 'same-locale-slug'
  | 'same-locale-key'
  | 'prefer-same-locale-key-fallback-slug'

export interface LinkResolverOptions {
  resolve?: LinkResolveMode
  localeField?: string
  slugField?: string
  keyField?: string
  defaultLocale?: string
}

export type ParseLinkResult =
  | { ok: true; value: LinkFrontmatter | null }
  | { ok: false; errors: string[] }

export interface LinkReference {
  target?: string
  locale?: string
  slug: string
  key?: string
}

export interface IndexedPage {
  slug: string
  key?: string
  locale?: string
  path: string
  title?: string
  keywords?: { primary?: string; secondary?: string[] }
  linksTo: string[]
  linkedFrom: string[]
  aliases: string[]
  linkRefs: LinkReference[]
  linkedFromRefs: LinkReference[]
}

export interface LinkAliasEntry {
  alias: string
  locale?: string
  replacement: string
  page: IndexedPage
}

export interface LinkIndex {
  pages: Map<string, IndexedPage>
  aliases: Map<string, string>
  aliasEntries: LinkAliasEntry[]
  options: Required<Pick<LinkResolverOptions, 'resolve'>> & Omit<LinkResolverOptions, 'resolve'>
}

export interface LinkInput {
  path: string
  data: Record<string, unknown>
}

export interface SerializedLinkIndex {
  pages: Array<
    Omit<IndexedPage, 'linkRefs' | 'linkedFromRefs' | 'linksTo' | 'linkedFrom'> & {
      linksTo: string[] | LinkReference[]
      linkedFrom: string[] | LinkReference[]
    }
  >
  aliases: Record<string, string | LinkReference>
}

export interface LinkDiagnostic {
  file: string
  diagnostic: Diagnostic
}

interface ResolvedTarget {
  page?: IndexedPage
  target: string
  explicitLocale?: string
  crossLocale: boolean
  matchedBy?: 'slug' | 'key' | 'alias'
}

const DEFAULT_OPTIONS: Required<Pick<LinkResolverOptions, 'resolve'>> = {
  resolve: 'global-slug',
}

const FM_POSITION: SourceRange = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
}

// Returns { value: null } when there is no `slug` (a non-participating page),
// parsed data when the link shape is valid, or shape errors otherwise. Never
// throws — callers turn errors into diagnostics.
export function parseLinkFrontmatter(
  data: Record<string, unknown>,
  options: LinkResolverOptions = {},
): ParseLinkResult {
  const normalized = normalizeFrontmatter(data, options)
  if (!('slug' in normalized)) return { ok: true, value: null }
  const parsed = LinkFrontmatter.safeParse(normalized)
  if (parsed.success) return { ok: true, value: parsed.data }
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
}

// Pure: builds the resolved link graph from per-file frontmatter data. Pass 1
// collects pages and registers aliases; pass 2 resolves each linksTo through
// the configured identity maps and inverts edges to derive linkedFrom.
export function buildLinkIndex(inputs: LinkInput[], options: LinkResolverOptions = {}): LinkIndex {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options }
  const pages = new Map<string, IndexedPage>()
  const aliases = new Map<string, string>()
  const aliasEntries: LinkAliasEntry[] = []

  for (const { path, data } of inputs) {
    const parsed = parseLinkFrontmatter(data, resolvedOptions)
    if (!parsed.ok || parsed.value === null) continue
    const fm = parsed.value
    const page: IndexedPage = {
      slug: fm.slug,
      key: fm.key,
      locale: effectiveLocale(fm, resolvedOptions),
      path,
      title: fm.title,
      keywords: fm.keywords,
      linksTo: [],
      linkedFrom: [],
      aliases: fm.aliases ?? [],
      linkRefs: [],
      linkedFromRefs: [],
    }
    pages.set(pageMapKey(page, resolvedOptions), page)
  }

  for (const page of pages.values()) {
    for (const alias of page.aliases) {
      const replacement = replacementFor(page, resolvedOptions)
      const key = aliasMapKey(alias, page.locale, resolvedOptions)
      aliases.set(key, replacement)
      aliasEntries.push({ alias, locale: page.locale, replacement, page })
    }
  }

  const lookup = buildLookup(pages, resolvedOptions)
  for (const page of pages.values()) {
    const source = parseLinkFrontmatter(
      inputForPage(page, inputs, resolvedOptions),
      resolvedOptions,
    )
    if (!source.ok || source.value === null) continue
    for (const rawTarget of source.value.linksTo ?? []) {
      const resolved = resolveTarget(rawTarget, page, lookup, resolvedOptions)
      if (!resolved.page) {
        page.linksTo.push(resolved.target)
        continue
      }
      page.linksTo.push(replacementFor(resolved.page, resolvedOptions))
      page.linkRefs.push(referenceFor(resolved.page, resolved.target))
      if (resolved.page === page) continue
      const from = replacementFor(page, resolvedOptions)
      if (!resolved.page.linkedFrom.includes(from)) resolved.page.linkedFrom.push(from)
      if (!resolved.page.linkedFromRefs.some((r) => sameReference(r, page))) {
        resolved.page.linkedFromRefs.push(referenceFor(page))
      }
    }
  }

  return { pages, aliases, aliasEntries, options: resolvedOptions }
}

// Stable, sorted JSON form for .contentbit/link-index.json. Global-slug projects
// keep the original compact string arrays; locale/key projects receive richer
// references so agents can see which local target was resolved.
export function serializeLinkIndex(index: LinkIndex): SerializedLinkIndex {
  const scoped = [...index.pages.values()].some((page) => page.locale || page.key)
  const pages = [...index.pages.values()]
    .map((p) => {
      const base = {
        slug: p.slug,
        ...(p.key ? { key: p.key } : {}),
        ...(p.locale ? { locale: p.locale } : {}),
        path: p.path,
        ...(p.title ? { title: p.title } : {}),
        ...(p.keywords ? { keywords: p.keywords } : {}),
        linksTo: scoped ? p.linkRefs : [...p.linksTo],
        linkedFrom: scoped ? sortedRefs(p.linkedFromRefs) : [...p.linkedFrom].sort(),
        aliases: [...p.aliases],
      }
      return base
    })
    .sort((a, b) => sortIdentity(a.locale, a.slug).localeCompare(sortIdentity(b.locale, b.slug)))
  const aliases: Record<string, string | LinkReference> = {}
  if (scoped) {
    for (const entry of [...index.aliasEntries].sort((a, b) =>
      sortIdentity(a.locale, a.alias).localeCompare(sortIdentity(b.locale, b.alias)),
    )) {
      aliases[aliasMapKey(entry.alias, entry.locale, index.options)] = referenceFor(entry.page)
    }
  } else {
    for (const key of [...index.aliases.keys()].sort()) aliases[key] = index.aliases.get(key)!
  }
  return { pages, aliases }
}

export function aliasReplacementsForPage(
  index: LinkIndex,
  data: Record<string, unknown>,
): Map<string, string> {
  const parsed = parseLinkFrontmatter(data, index.options)
  const out = new Map<string, string>()
  if (!parsed.ok || parsed.value === null) return out
  const locale = effectiveLocale(parsed.value, index.options)
  for (const entry of index.aliasEntries) {
    if (index.options.resolve === 'global-slug' || entry.locale === locale) {
      out.set(entry.alias, entry.replacement)
    }
  }
  return out
}

// Cross-file link validation. Emits shape errors, duplicate-slug and
// alias-conflict errors, dangling-link errors (with did-you-mean), and
// self-link / orphan warnings. Returns file-tagged diagnostics so the CLI can
// format each with its own filename.
export function validateLinks(
  inputs: LinkInput[],
  options: LinkResolverOptions = {},
): LinkDiagnostic[] {
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options }
  const out: LinkDiagnostic[] = []
  const validInputs: Array<{ path: string; fm: LinkFrontmatter }> = []
  const seenSlug = new Map<string, string>() // identity -> first file
  const seenKey = new Map<string, string>() // identity -> first file
  const seenAlias = new Map<string, string>() // identity -> file

  // Shape + duplicate/alias-conflict pass (operates on raw inputs).
  for (const { path, data } of inputs) {
    const parsed = parseLinkFrontmatter(data, resolvedOptions)
    if (!parsed.ok) {
      for (const e of parsed.errors)
        out.push(diag(path, 'CB_LINK_SHAPE', 'error', `invalid link frontmatter: ${e}`))
      continue
    }
    if (parsed.value === null) continue
    const fm = parsed.value
    const locale = effectiveLocale(fm, resolvedOptions)
    validInputs.push({ path, fm })

    const slugKey = scopedKey(fm.slug, locale, resolvedOptions)
    const prior = seenSlug.get(slugKey)
    if (prior)
      out.push(diag(path, 'CB_SLUG_DUPLICATE', 'error', `slug "${fm.slug}" also used by ${prior}`))
    else seenSlug.set(slugKey, path)

    if (usesKeyResolution(resolvedOptions) && !fm.key) {
      out.push(diag(path, 'CB_KEY_MISSING', 'error', `page "${fm.slug}" is missing key`))
    }
    if (fm.key) {
      const keyKey = scopedKey(fm.key, locale, resolvedOptions)
      const priorKey = seenKey.get(keyKey)
      if (priorKey)
        out.push(
          diag(path, 'CB_KEY_DUPLICATE', 'error', `key "${fm.key}" also used by ${priorKey}`),
        )
      else seenKey.set(keyKey, path)
    }

    for (const alias of fm.aliases ?? []) {
      const aliasKey = scopedKey(alias, locale, resolvedOptions)
      if (seenAlias.has(aliasKey))
        out.push(
          diag(
            path,
            'CB_ALIAS_CONFLICT',
            'error',
            `alias "${alias}" already declared by ${seenAlias.get(aliasKey)}`,
          ),
        )
      else seenAlias.set(aliasKey, path)
    }
  }

  const index = buildLinkIndex(inputs, resolvedOptions)
  const lookup = buildLookup(index.pages, resolvedOptions)

  for (const { fm } of validInputs) {
    const page = index.pages.get(
      pageMapKey(frontmatterIdentity(fm, resolvedOptions), resolvedOptions),
    )
    if (!page) continue
    // alias colliding with a real slug/key in the same scope
    for (const alias of page.aliases) {
      if (collidesWithPageIdentity(alias, page.locale, lookup, resolvedOptions))
        out.push(
          diag(
            page.path,
            'CB_ALIAS_CONFLICT',
            'error',
            `alias "${alias}" collides with an existing page identity`,
          ),
        )
    }
    for (const target of fm.linksTo ?? []) {
      const resolved = resolveTarget(target, page, lookup, resolvedOptions)
      if (resolved.page === page) {
        out.push(diag(page.path, 'CB_LINK_SELF', 'warning', `page "${page.slug}" links to itself`))
        continue
      }
      if (resolved.page && resolved.crossLocale) {
        out.push(
          diag(
            page.path,
            'CB_LINK_CROSS_LOCALE',
            'warning',
            `linksTo "${resolved.target}" resolves to locale "${resolved.page.locale}"`,
          ),
        )
        continue
      }
      if (!resolved.page) {
        if (targetExistsOutsideLocale(resolved.target, page.locale, lookup, resolvedOptions)) {
          out.push(
            diag(
              page.path,
              'CB_LINK_LOCALE_MISSING',
              'error',
              `linksTo "${resolved.target}" exists in another locale but not "${page.locale ?? 'default'}"`,
            ),
          )
          continue
        }
        const hint = closest(resolved.target, candidatesFor(page.locale, lookup, resolvedOptions))
        out.push(
          diag(
            page.path,
            'CB_LINK_UNRESOLVED',
            'error',
            `linksTo "${resolved.target}" does not resolve to any page`,
            hint ? `Did you mean "${hint}"?` : undefined,
          ),
        )
      }
    }
    if (page.linkedFrom.length === 0)
      out.push(
        diag(page.path, 'CB_LINK_ORPHAN', 'warning', `page "${page.slug}" has no inbound links`),
      )
  }
  return out
}

function normalizeFrontmatter(
  data: Record<string, unknown>,
  options: LinkResolverOptions,
): Record<string, unknown> {
  const out = { ...data }
  copyConfiguredField(out, data, options.slugField, 'slug')
  copyConfiguredField(out, data, options.keyField, 'key')
  copyConfiguredField(out, data, options.localeField, 'locale')
  return out
}

function copyConfiguredField(
  out: Record<string, unknown>,
  data: Record<string, unknown>,
  from: string | undefined,
  to: string,
): void {
  if (!from || from === to || !(from in data) || to in out) return
  out[to] = data[from]
}

function effectiveLocale(
  fm: Pick<LinkFrontmatter, 'locale'>,
  options: LinkResolverOptions,
): string | undefined {
  return fm.locale ?? options.defaultLocale
}

function frontmatterIdentity(
  fm: LinkFrontmatter,
  options: LinkResolverOptions,
): Pick<IndexedPage, 'slug' | 'key' | 'locale'> {
  return { slug: fm.slug, key: fm.key, locale: effectiveLocale(fm, options) }
}

function pageMapKey(
  page: Pick<IndexedPage, 'slug' | 'key' | 'locale'>,
  options: LinkResolverOptions,
): string {
  if (options.resolve === 'global-slug') return page.slug
  return scopedKey(page.slug, page.locale, options)
}

function scopedKey(
  value: string,
  locale: string | undefined,
  options: LinkResolverOptions,
): string {
  if (options.resolve === 'global-slug') return value
  return `${locale ?? ''}\0${value}`
}

function aliasMapKey(
  alias: string,
  locale: string | undefined,
  options: LinkResolverOptions,
): string {
  return options.resolve === 'global-slug' ? alias : `${locale ?? ''}:${alias}`
}

function replacementFor(page: IndexedPage, options: LinkResolverOptions): string {
  if (options.resolve === 'same-locale-key') return page.key ?? page.slug
  if (options.resolve === 'prefer-same-locale-key-fallback-slug') return page.key ?? page.slug
  return page.slug
}

function referenceFor(page: IndexedPage, target?: string): LinkReference {
  return {
    ...(target ? { target } : {}),
    ...(page.locale ? { locale: page.locale } : {}),
    slug: page.slug,
    ...(page.key ? { key: page.key } : {}),
  }
}

function sameReference(ref: LinkReference, page: IndexedPage): boolean {
  return ref.slug === page.slug && ref.locale === page.locale && ref.key === page.key
}

function sortedRefs(refs: LinkReference[]): LinkReference[] {
  return [...refs].sort((a, b) =>
    sortIdentity(a.locale, a.key ?? a.slug).localeCompare(sortIdentity(b.locale, b.key ?? b.slug)),
  )
}

function sortIdentity(locale: string | undefined, value: string): string {
  return `${locale ?? ''}\0${value}`
}

interface Lookup {
  bySlug: Map<string, IndexedPage[]>
  byScopedSlug: Map<string, IndexedPage>
  byKey: Map<string, IndexedPage[]>
  byScopedKey: Map<string, IndexedPage>
  aliasBySlug: Map<string, IndexedPage>
  aliasByScopedSlug: Map<string, IndexedPage>
  aliasByKey: Map<string, IndexedPage>
  aliasByScopedKey: Map<string, IndexedPage>
}

function buildLookup(pages: Map<string, IndexedPage>, options: LinkResolverOptions): Lookup {
  const lookup: Lookup = {
    bySlug: new Map(),
    byScopedSlug: new Map(),
    byKey: new Map(),
    byScopedKey: new Map(),
    aliasBySlug: new Map(),
    aliasByScopedSlug: new Map(),
    aliasByKey: new Map(),
    aliasByScopedKey: new Map(),
  }
  for (const page of pages.values()) {
    pushMulti(lookup.bySlug, page.slug, page)
    lookup.byScopedSlug.set(scopedKey(page.slug, page.locale, options), page)
    if (page.key) {
      pushMulti(lookup.byKey, page.key, page)
      lookup.byScopedKey.set(scopedKey(page.key, page.locale, options), page)
    }
    for (const alias of page.aliases) {
      lookup.aliasBySlug.set(alias, page)
      lookup.aliasByScopedSlug.set(scopedKey(alias, page.locale, options), page)
      if (page.key) {
        lookup.aliasByKey.set(alias, page)
        lookup.aliasByScopedKey.set(scopedKey(alias, page.locale, options), page)
      }
    }
  }
  return lookup
}

function pushMulti(map: Map<string, IndexedPage[]>, key: string, page: IndexedPage): void {
  const existing = map.get(key)
  if (existing) existing.push(page)
  else map.set(key, [page])
}

function resolveTarget(
  rawTarget: LinkTarget,
  source: IndexedPage,
  lookup: Lookup,
  options: LinkResolverOptions,
): ResolvedTarget {
  if (typeof rawTarget !== 'string') {
    const locale = rawTarget.locale ?? source.locale
    const page = rawTarget.key
      ? lookup.byScopedKey.get(scopedKey(rawTarget.key, locale, options))
      : rawTarget.slug
        ? lookup.byScopedSlug.get(scopedKey(rawTarget.slug, locale, options))
        : undefined
    const target = rawTarget.key ?? rawTarget.slug ?? ''
    return {
      page,
      target,
      explicitLocale: rawTarget.locale,
      crossLocale: Boolean(page && rawTarget.locale && rawTarget.locale !== source.locale),
      matchedBy: rawTarget.key ? 'key' : 'slug',
    }
  }

  const locale = source.locale
  if (options.resolve === 'global-slug') {
    const page = lookup.aliasBySlug.get(rawTarget) ?? single(lookup.bySlug.get(rawTarget))
    return { page, target: rawTarget, crossLocale: false, matchedBy: page ? 'slug' : undefined }
  }

  if (options.resolve === 'same-locale-key') {
    const scoped = scopedKey(rawTarget, locale, options)
    const page = lookup.byScopedKey.get(scoped) ?? lookup.aliasByScopedKey.get(scoped)
    return { page, target: rawTarget, crossLocale: false, matchedBy: page ? 'key' : undefined }
  }

  if (options.resolve === 'prefer-same-locale-key-fallback-slug') {
    const scoped = scopedKey(rawTarget, locale, options)
    const page =
      lookup.byScopedKey.get(scoped) ??
      lookup.aliasByScopedKey.get(scoped) ??
      lookup.byScopedSlug.get(scoped) ??
      lookup.aliasByScopedSlug.get(scoped)
    return { page, target: rawTarget, crossLocale: false, matchedBy: page ? 'key' : undefined }
  }

  const scoped = scopedKey(rawTarget, locale, options)
  const page = lookup.byScopedSlug.get(scoped) ?? lookup.aliasByScopedSlug.get(scoped)
  return { page, target: rawTarget, crossLocale: false, matchedBy: page ? 'slug' : undefined }
}

function single<T>(values: T[] | undefined): T | undefined {
  return values?.length === 1 ? values[0] : undefined
}

function usesKeyResolution(options: LinkResolverOptions): boolean {
  return options.resolve === 'same-locale-key'
}

function collidesWithPageIdentity(
  alias: string,
  locale: string | undefined,
  lookup: Lookup,
  options: LinkResolverOptions,
): boolean {
  if (options.resolve === 'global-slug') return lookup.bySlug.has(alias)
  const scoped = scopedKey(alias, locale, options)
  return (
    lookup.byScopedSlug.has(scoped) ||
    (usesKeyResolution(options) && lookup.byScopedKey.has(scoped))
  )
}

function targetExistsOutsideLocale(
  target: string,
  locale: string | undefined,
  lookup: Lookup,
  options: LinkResolverOptions,
): boolean {
  if (options.resolve === 'global-slug') return false
  const byIdentity = usesKeyResolution(options) ? lookup.byKey : lookup.bySlug
  return (byIdentity.get(target) ?? []).some((page) => page.locale !== locale)
}

function candidatesFor(
  locale: string | undefined,
  lookup: Lookup,
  options: LinkResolverOptions,
): string[] {
  if (options.resolve === 'global-slug') return [...lookup.bySlug.keys()]
  const out: string[] = []
  for (const page of lookup.byScopedSlug.values()) {
    if (page.locale === locale)
      out.push(usesKeyResolution(options) && page.key ? page.key : page.slug)
  }
  return out
}

function inputForPage(
  page: IndexedPage,
  inputs: LinkInput[],
  options: LinkResolverOptions,
): Record<string, unknown> {
  for (const input of inputs) {
    const parsed = parseLinkFrontmatter(input.data, options)
    if (!parsed.ok || parsed.value === null) continue
    const identity = frontmatterIdentity(parsed.value, options)
    if (pageMapKey(identity, options) === pageMapKey(page, options)) return input.data
  }
  return {}
}

function diag(
  file: string,
  code: string,
  severity: Diagnostic['severity'],
  message: string,
  hint?: string,
): LinkDiagnostic {
  return { file, diagnostic: { code, severity, message, hint, position: FM_POSITION } }
}

// Levenshtein distance for did-you-mean hints. Small inputs (slugs), so the
// simple O(n*m) matrix is fine.
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

function closest(target: string, candidates: string[]): string | undefined {
  let best: string | undefined
  let bestD = Infinity
  for (const c of candidates) {
    const d = editDistance(target, c)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best && bestD <= Math.max(2, Math.floor(target.length / 3)) ? best : undefined
}
