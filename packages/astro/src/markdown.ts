import { fallbackMarkdown } from './html.js'

/** Minimal safe prose fallback. Pass renderMarkdown to use the host app's Markdown pipeline. */
export function defaultRenderMarkdown(source: string): string {
  return fallbackMarkdown(source)
}
