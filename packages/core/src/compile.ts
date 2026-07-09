import type { BlockRegistry } from './registry.js'
import type { ValidateOptions, ValidatedDocumentNode, ValidationResult } from './validate.js'

import { formatDiagnostic } from './diagnostics.js'
import { stripFrontmatter } from './frontmatter.js'
import { parseDocument } from './parser.js'
import { validateDocument } from './validate.js'

export interface CompileDocumentOptions extends ValidateOptions {
  /** Preserve YAML frontmatter as Markdown instead of stripping it. Default false. */
  preserveFrontmatter?: boolean
}

/** Parse and validate a source document through the normal content pipeline. */
export function compileDocument(
  source: string,
  registry: BlockRegistry,
  options: CompileDocumentOptions = {},
): ValidationResult {
  const { preserveFrontmatter = false, ...validateOptions } = options
  return validateDocument(
    parseDocument(preserveFrontmatter ? source : stripFrontmatter(source)),
    registry,
    validateOptions,
  )
}

export class ContentValidationError extends Error {
  constructor(
    readonly result: ValidationResult,
    readonly file: string,
  ) {
    super(result.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic, file)).join('\n\n'))
    this.name = 'ContentValidationError'
  }
}

/** Return a validated document or throw all formatted diagnostics. */
export function assertValidDocument(
  result: ValidationResult,
  file = 'content.md',
): ValidatedDocumentNode {
  if (!result.ok) throw new ContentValidationError(result, file)
  return result.document
}
