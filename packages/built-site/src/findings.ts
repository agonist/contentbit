import type { ElementContext, PagePath } from './model.js'

export type SiteFindingSeverity = 'error' | 'warning'

export const SITE_FINDING_CODES = {
  CB_PAGE_TITLE_MISSING: 'error',
  CB_PAGE_TITLE_DUPLICATE: 'warning',
  CB_PAGE_DESCRIPTION_MISSING: 'warning',
  CB_PAGE_DESCRIPTION_DUPLICATE: 'warning',
  CB_PAGE_CANONICAL_MISSING: 'warning',
  CB_PAGE_CANONICAL_ELSEWHERE: 'warning',
  CB_PAGE_CANONICAL_ORIGIN: 'warning',
  CB_PAGE_H1_MISSING: 'warning',
  CB_PAGE_H1_MULTIPLE: 'warning',
  CB_PAGE_IMAGE_ALT_MISSING: 'warning',
  CB_PAGE_STRUCTURED_DATA_INVALID: 'error',
  CB_PAGE_BROWSER_RENDERED: 'warning',
  CB_PAGE_TITLE_MISMATCH: 'warning',
  CB_PAGE_DESCRIPTION_MISMATCH: 'warning',
  CB_LINK_PAGE_MISSING: 'error',
  CB_LINK_ANCHOR_MISSING: 'error',
  CB_LINK_FILE_MISSING: 'error',
  CB_LINK_NOINDEX_TARGET: 'warning',
  CB_SITE_HREFLANG_NOT_RECIPROCAL: 'warning',
  CB_SITE_HREFLANG_X_DEFAULT_MISSING: 'warning',
  CB_SITE_SITEMAP_URL_NOT_BUILT: 'error',
  CB_SITE_SITEMAP_PAGE_MISSING: 'warning',
  CB_SITE_SITEMAP_NOINDEX: 'warning',
  CB_SITE_SOURCE_NOT_BUILT: 'error',
} as const satisfies Record<string, SiteFindingSeverity>

export type SiteFindingCode = keyof typeof SITE_FINDING_CODES

export type SiteFindingOrigin =
  | { kind: 'source'; file: string; line: number; column?: number; page: PagePath }
  /** element is absent when the grouped findings name none, as site checks do. */
  | { kind: 'template'; element?: string; pages: PagePath[] }
  | { kind: 'page'; page: PagePath }

export interface SiteFindingSubject {
  /** The href, image src, URL or value the finding is about. */
  target?: string
  /** What on the page has the problem: a link or image as elementKey() names it, or a fixed head subject such as 'title'. */
  element?: string
}

export interface SiteFindingOccurrence {
  page: PagePath
  target?: string
}

export interface SiteFinding extends SiteFindingSubject {
  code: SiteFindingCode
  severity: SiteFindingSeverity
  message: string
  hint?: string
  origin: SiteFindingOrigin
  /** A template finding's page findings, one for each page and target. */
  occurrences?: SiteFindingOccurrence[]
}

export function siteFinding(
  code: SiteFindingCode,
  origin: SiteFindingOrigin,
  message: string,
  hint?: string,
  { target, element }: SiteFindingSubject = {},
): SiteFinding {
  return {
    code,
    severity: SITE_FINDING_CODES[code],
    message,
    ...(hint !== undefined && { hint }),
    ...(target !== undefined && { target }),
    ...(element !== undefined && { element }),
    origin,
  }
}

/** 'nav a.content-toc-link', or 'body img' for an element outside every landmark. */
export function elementKey({ landmark, selector }: ElementContext): string {
  return `${landmark ?? 'body'} ${selector}`
}
