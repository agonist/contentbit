import type { AstroMarkdownRenderer } from './types.js'

import { fallbackMarkdown } from './html.js'

/** Minimal safe prose fallback. Pass renderMarkdown to use the host app's Markdown pipeline. */
export const defaultRenderMarkdown: AstroMarkdownRenderer = (source) => {
  return fallbackMarkdown(source)
}
