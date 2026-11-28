import type { SiteFinding } from './findings.js'
import type { PagePath, RenderedPageFacts } from './model.js'

export const SITE_CHECK_SCHEMA_VERSION = 'contentbit.site-check.v1' as const

export interface SiteCheck {
  schemaVersion: typeof SITE_CHECK_SCHEMA_VERSION
  input: { kind: 'folder'; path: string } | { kind: 'url'; url: string }
  origin?: string
  summary: { pages: number; errors: number; warnings: number }
  pages: Array<{ path: PagePath; file?: string; source?: string; facts: RenderedPageFacts }>
  findings: SiteFinding[]
}
