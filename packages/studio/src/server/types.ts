import type { DocumentStats, LinkReference, LinkResolverOptions } from '@contentbit/core'
import type { BlockComponent } from '@contentbit/react'

export type StudioSeverity = 'error' | 'warning' | 'info'
export type StudioStatus = 'error' | 'warning' | 'suggestion' | 'healthy'
export type StudioFindingSource = 'validation' | 'links' | 'stats'

export interface StudioFinding {
  severity: StudioSeverity
  source: StudioFindingSource
  code: string
  file: string
  relativePath: string
  line?: number
  column?: number
  message: string
  hint?: string
}

export interface StudioKeywordData {
  primary?: string
  secondary?: string[]
}

export interface StudioFileSummary {
  path: string
  relativePath: string
  title: string
  slug?: string
  key?: string
  locale?: string
  keywords?: StudioKeywordData
  words: number
  readingMinutes: number
  blocks: number
  blockNames: Record<string, number>
  links: number
  externalLinks: number
  missingAlt: number
  findings: { errors: number; warnings: number; suggestions: number }
  status: StudioStatus
}

export interface StudioProject {
  root: string
  files: StudioFileSummary[]
  summary: {
    files: number
    errors: number
    warnings: number
    suggestions: number
    words: number
    blocks: number
    links: number
    missingAlt: number
  }
  blockUsage: Record<string, number>
  keywordCoverage: { total: number; withPrimary: number; withSecondary: number }
  linkGraph?: { pages: number; links: number; orphans: number }
  findings: StudioFinding[]
}

export interface StudioDocument {
  file: StudioFileSummary
  source: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
  findings: StudioFinding[]
  linksTo: string[] | LinkReference[]
  linkedFrom: string[] | LinkReference[]
  previewHtml: string
}

export interface StudioGraphNode {
  id: string
  label: string
  path: string
  status: StudioStatus
  slug?: string
  key?: string
  locale?: string
}

export interface StudioGraphEdge {
  from: string
  to?: string
  target: string
  status: 'resolved' | 'unresolved' | 'cross-locale' | 'self'
}

export interface StudioGraph {
  nodes: StudioGraphNode[]
  edges: StudioGraphEdge[]
}

export interface StudioOptions {
  globs: string[]
  registryPath?: string
  includeGenericBlocks?: boolean
  cwd?: string
  linkOptions?: LinkResolverOptions
  minSectionWords?: number
  previewComponents?: () => Promise<Record<string, BlockComponent> | undefined>
}

export interface StartStudioOptions extends StudioOptions {
  host?: string
  port?: number
  open?: boolean
}
