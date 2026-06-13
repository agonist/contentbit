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
  type LinkFrontmatter,
  type ParseLinkResult,
  type IndexedPage,
  type LinkIndex,
  type LinkInput,
  type LinkDiagnostic,
} from './links.js'
