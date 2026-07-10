export { VERSION } from './version.js'
export { defineContentConfig, type ContentbitConfig, type ContentbitConfigInput } from './config.js'
export type { SourcePoint, SourceRange, Severity, Diagnostic } from './diagnostics.js'
export { formatDiagnostic } from './diagnostics.js'
export type { DocumentNode, ContentNode, MarkdownNode, BlockNode } from './ast.js'
export { parseDocument, type ParseResult } from './parser.js'
export { stripFrontmatter, extractFrontmatter, type Frontmatter } from './frontmatter.js'
export {
  analyzeDocument,
  type AnalyzeOptions,
  type DocumentStats,
  type OutlineEntry,
  type BlockInstance,
  type LinkItem,
} from './analyze.js'
export {
  DEFAULT_MIN_SECTION_WORDS,
  compareContentProjectFindings,
  scanContentProject,
  summarizeContentProjectFindings,
  type ContentProjectFileScan,
  type ContentProjectFinding,
  type ContentProjectFindingSource,
  type ContentProjectFindingSummary,
  type ContentProjectLinkGraph,
  type ContentProjectScan,
  type ContentProjectSourceFile,
  type ScanContentProjectOptions,
} from './project-scan.js'
export {
  scanContentIntegrity,
  type ContentIntegrityFile,
  type ContentIntegrityFinding,
} from './content-integrity.js'
export {
  contentPageIdentity,
  keywordsValue,
  normalizeContentPageFrontmatter,
  readContentPageFacts,
  type ContentPageFacts,
  type ContentPageKeywords,
} from './page-facts.js'
export {
  createLinkGraphView,
  linkGraphSummary,
  pageIdentity,
  type LinkGraphEdge,
  type LinkGraphNode,
  type LinkGraphSummary,
  type LinkGraphView,
} from './link-graph.js'
export {
  SEO_BRIEF_SCHEMA_VERSION,
  SEO_RESULT_SCHEMA_VERSION,
  createSeoBrief,
  defineSeoConfig,
  evaluateSeoProject,
  formatSeoBriefMarkdown,
  parseSeoConfig,
  type EvaluateSeoProjectInput,
  type NormalizedSeoSection,
  type ParseSeoConfigResult,
  type SeoBrief,
  type SeoConfig,
  type SeoConfigDiagnostic,
  type SeoConfigInput,
  type SeoConfigPage,
  type SeoFinding,
  type SeoFindingCode,
  type SeoPage,
  type SeoPageTypeContract,
  type SeoProjectEvaluation,
  type SeoProjectFile,
  type SeoRequiredSectionInput,
} from './seo.js'
export { parseProps } from './props.js'
export { bodyLineRange } from './position.js'
export {
  createBlockRegistry,
  defineBlock,
  BlockRegistry,
  type BlockDefinition,
  type BlockData,
  type BlockName,
  type BlockProps,
  type BlockPropsOf,
  type ContentModel,
  type AuthoringMeta,
  type Report,
} from './registry.js'
export {
  markdownBody,
  pipeRows,
  listItems,
  childBlocks,
  type MarkdownBodyData,
  type PipeRowsData,
  type ListItemsData,
  type ListItem,
  type ChildBlocksData,
} from './content-models.js'
export {
  validateDocument,
  isValidatedBlock,
  isValidatedDocument,
  isProcessedDocument,
  type ValidateOptions,
  type ValidationSuccess,
  type ValidationFailure,
  type ValidationResult,
  type ValidatedBlockNode,
  type ValidatedDocumentNode,
  type ProcessedDocumentNode,
} from './validate.js'
export {
  assertValidDocument,
  compileDocument,
  ContentValidationError,
  type CompileDocumentOptions,
} from './compile.js'
export { generateAuthoringGuide, type AuthoringGuideOptions } from './authoring.js'
export {
  defineMarkdownBlockRenderer,
  defineMarkdownRenderers,
  renderToMarkdown,
  type MarkdownBlockRenderer,
  type MarkdownBlockRendererFor,
  type MarkdownRenderContext,
  type MarkdownRenderersFor,
  type RenderToMarkdownOptions,
} from './render-markdown.js'
export {
  parseLinkFrontmatter,
  buildLinkIndex,
  validateLinks,
  serializeLinkIndex,
  aliasReplacementsForPage,
  type LinkResolveMode,
  type LinkResolverOptions,
  type LinkTarget,
  type LinkFrontmatter,
  type ParseLinkResult,
  type LinkReference,
  type IndexedPage,
  type LinkAliasEntry,
  type LinkIndex,
  type LinkInput,
  type LinkDiagnostic,
  type SerializedLinkIndex,
} from './links.js'
