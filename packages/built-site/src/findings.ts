import type { PagePath } from './model.js'

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
  | { kind: 'template'; element: string; pages: PagePath[] }
  | { kind: 'page'; page: PagePath }

export interface SiteFinding {
  code: SiteFindingCode
  severity: SiteFindingSeverity
  message: string
  hint?: string
  origin: SiteFindingOrigin
}
