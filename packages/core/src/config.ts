import type { LinkResolverOptions } from './links.js'

export interface ContentbitSiteConfig {
  /** The static build folder, relative to this config file. */
  build?: string
  origin?: string
  /** The frontmatter field that makes a document a draft when it is `true` or the string `true` in any case. Default `draft`. */
  draftField?: string
  /** The frontmatter field with a document's publication date. Default `date`. */
  dateField?: string
}

export interface ContentbitConfig {
  /** Content files, relative to this config file. */
  content?: string[]
  /** Custom block registry module, relative to this config file. */
  registry?: string
  /** Include the built-in generic block pack. Default true. */
  genericBlocks?: boolean
  /** Shared internal-link resolution fields and mode. */
  links?: LinkResolverOptions
  /** SEO config module, relative to this config file; false disables discovery. */
  seo?: string | false
  /** The built site that `contentbit check` reads. */
  site?: ContentbitSiteConfig
}

export type ContentbitConfigInput = Omit<ContentbitConfig, 'content'> & {
  content?: string | string[]
}

/** Type and normalize the project-wide contentbit command configuration. */
export function defineContentConfig(input: ContentbitConfigInput): ContentbitConfig {
  const { content } = input
  return { ...input, content: typeof content === 'string' ? [content] : content }
}
