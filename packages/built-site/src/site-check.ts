import type { ContentProjectFinding } from '@contentbit/core'

import type { SiteFinding } from './findings.js'
import type { BuiltSite, PagePath, RenderedPageFacts } from './model.js'

export const SITE_CHECK_SCHEMA_VERSION = 'contentbit.site-check.v1' as const

export interface SiteOrigin {
  url: string
  source: 'flag' | 'config' | 'canonicals'
}

export interface SiteCheck {
  schemaVersion: typeof SITE_CHECK_SCHEMA_VERSION
  /** none: no build folder was found; searched lists the folders tried. */
  input:
    | { kind: 'folder'; path: string }
    | { kind: 'url'; url: string }
    | { kind: 'none'; searched: string[] }
  origin?: SiteOrigin
  /** errors and warnings count the built-page and the Markdown findings. */
  summary: { pages: number; errors: number; warnings: number }
  pages: Array<{ path: PagePath; file?: string; source?: string; facts: RenderedPageFacts }>
  findings: SiteFinding[]
  /** Absent when no Markdown content was checked. */
  content?: { files: number; findings: ContentProjectFinding[] }
}

export function createSiteCheck({
  input,
  site,
  origin,
  findings,
  content,
}: {
  input: SiteCheck['input']
  site?: BuiltSite
  origin?: SiteOrigin
  findings: SiteFinding[]
  content?: SiteCheck['content']
}): SiteCheck {
  const pages = site?.pages ?? []
  const severities = [...findings, ...(content?.findings ?? [])].map(({ severity }) => severity)
  return {
    schemaVersion: SITE_CHECK_SCHEMA_VERSION,
    input,
    origin,
    summary: {
      pages: pages.length,
      errors: severities.filter((severity) => severity === 'error').length,
      warnings: severities.filter((severity) => severity === 'warning').length,
    },
    pages,
    findings,
    content,
  }
}
