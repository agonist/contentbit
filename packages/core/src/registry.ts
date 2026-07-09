import type { ZodType } from 'zod'

import type { BlockNode } from './ast.js'
import type { Diagnostic } from './diagnostics.js'

import { generateAuthoringGuide, type AuthoringGuideOptions } from './authoring.js'

export type Report = (d: Diagnostic) => void

/** How a block's body is parsed and validated. Created via content-model helpers. */
export interface ContentModel<TData = unknown> {
  kind: string
  /** One-line shape description used in generated authoring guides. */
  describe(): string
  /** Parse the body; report() diagnostics with positions; always return best-effort data. */
  parse(node: BlockNode, report: Report): TData
}

export interface AuthoringMeta {
  useWhen: string[]
  avoidWhen: string[]
  example: string
}

export type BlockProps = Record<string, unknown>

export interface BlockDefinition<
  TData = unknown,
  TProps extends BlockProps = BlockProps,
  TName extends string = string,
> {
  name: TName
  description: string
  /** zod schema for the open-line props. Omit for prop-less blocks. */
  props?: ZodType<TProps>
  content: ContentModel<TData>
  /** Only valid nested inside a parent that allows it (e.g. `tab` inside `tabs`). */
  childOnly?: boolean
  /** Hint for renderers: needs client-side behavior (e.g. tabs). */
  interactive?: boolean
  version?: string
  authoring: AuthoringMeta
}

export type BlockData<TDefinition extends BlockDefinition> =
  TDefinition extends BlockDefinition<infer TData, BlockProps, string> ? TData : never
export type BlockPropsOf<TDefinition extends BlockDefinition> =
  TDefinition extends BlockDefinition<unknown, infer TProps, string> ? TProps : never
export type BlockName<TDefinition extends BlockDefinition> = TDefinition['name']

type PropsFromSchema<TSchema extends ZodType | undefined> =
  TSchema extends ZodType<infer TProps>
    ? TProps extends BlockProps
      ? TProps
      : BlockProps
    : Record<string, never>

type BlockDefinitionInput<TData, TSchema extends ZodType | undefined, TName extends string> = Omit<
  BlockDefinition<TData, PropsFromSchema<TSchema>, TName>,
  'props'
> & {
  props?: TSchema
}

const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export function defineBlock<
  TData = unknown,
  TSchema extends ZodType | undefined = undefined,
  const TName extends string = string,
>(
  def: BlockDefinitionInput<TData, TSchema, TName>,
): BlockDefinition<TData, PropsFromSchema<TSchema>, TName> {
  if (!KEBAB_RE.test(def.name)) {
    throw new Error(`Block name "${def.name}" must be lowercase kebab-case.`)
  }
  return def as BlockDefinition<TData, PropsFromSchema<TSchema>, TName>
}

export class BlockRegistry {
  private defs = new Map<string, BlockDefinition<unknown>>()

  use(pack: ReadonlyArray<BlockDefinition<never>> | ReadonlyArray<BlockDefinition<unknown>>): this {
    for (const def of pack) this.add(def as BlockDefinition<unknown>)
    return this
  }

  add(def: BlockDefinition<never> | BlockDefinition<unknown>): this {
    const d = def as BlockDefinition<unknown>
    if (this.defs.has(d.name)) {
      throw new Error(
        `Duplicate block "${d.name}". Namespace it (e.g. "acme-${d.name}") or remove the duplicate.`,
      )
    }
    this.defs.set(d.name, d)
    return this
  }

  get(name: string): BlockDefinition<unknown> | undefined {
    return this.defs.get(name)
  }

  all(): BlockDefinition<unknown>[] {
    return [...this.defs.values()]
  }

  toAuthoringGuide(opts: AuthoringGuideOptions = {}): string {
    return generateAuthoringGuide(this.all(), opts)
  }
}

export function createBlockRegistry(): BlockRegistry {
  return new BlockRegistry()
}
