export { VERSION } from './version.js'
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
export { parseProps } from './props.js'
export { bodyLineRange } from './position.js'
export {
  createBlockRegistry,
  defineBlock,
  BlockRegistry,
  type BlockDefinition,
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
  type ValidateOptions,
  type ValidationResult,
  type ValidatedBlockNode,
} from './validate.js'
export { generateAuthoringGuide, type AuthoringGuideOptions } from './authoring.js'
export {
  renderToMarkdown,
  type MarkdownBlockRenderer,
  type MarkdownRenderContext,
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
