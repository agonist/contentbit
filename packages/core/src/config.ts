import type { LinkResolverOptions } from './links.js'

export interface ContentbitConfig {
  /** Content files, relative to this config file. */
  content: string[]
  /** Custom block registry module, relative to this config file. */
  registry?: string
  /** Include the built-in generic block pack. Default true. */
  genericBlocks?: boolean
  /** Shared internal-link resolution fields and mode. */
  links?: LinkResolverOptions
  /** SEO config module, relative to this config file; false disables discovery. */
  seo?: string | false
}

export type ContentbitConfigInput = Omit<ContentbitConfig, 'content'> & {
  content: string | string[]
}

/** Type and normalize the project-wide contentbit command configuration. */
export function defineContentConfig(input: ContentbitConfigInput): ContentbitConfig {
  return {
    ...input,
    content: typeof input.content === 'string' ? [input.content] : input.content,
  }
}
