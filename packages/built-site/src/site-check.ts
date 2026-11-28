import type { ContentProjectFinding } from '@contentbit/core'

import type { SiteFinding } from './findings.js'
import type { BuiltSite, PagePath, RenderedPageFacts } from './model.js'
import type { SiteSources } from './sources.js'

export const SITE_CHECK_SCHEMA_VERSION = 'contentbit.site-check.v1' as const

export interface SiteOrigin {
  url: string
  source: 'flag' | 'config' | 'canonicals'
}

export interface SiteCheck {
  schemaVersion: typeof SITE_CHECK_SCHEMA_VERSION
  input:
    | { kind: 'folder'; path: string }
    | { kind: 'url'; url: string }
    | { kind: 'none'; searched: string[] }
  origin?: SiteOrigin
  /** errors and warnings count the built-page and the Markdown findings. */
  summary: { pages: number; errors: number; warnings: number }
  pages: Array<{ path: PagePath; file?: string; source?: string; facts: RenderedPageFacts }>
  findings: SiteFinding[]
  content?: { files: number; findings: ContentProjectFinding[] }
}

export function createSiteCheck({
  input,
  site,
  origin,
  findings,
  content,
  sources,
}: {
  input: SiteCheck['input']
  site?: BuiltSite
  origin?: SiteOrigin
  findings: SiteFinding[]
  content?: SiteCheck['content']
  sources?: SiteSources
}): SiteCheck {
  const pages = (site?.pages ?? []).map(({ path, file, facts }) => {
    const source = sources?.pages.get(path)
    return { path, file, ...(source && { source: source.file }), facts }
  })
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
