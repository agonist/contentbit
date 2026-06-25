import type { HtmlBlockRenderer } from './render.js'

import { genericHtmlStringRenderers, isPromiseLike } from '@contentbit/blocks'

export const genericHtmlRenderers: Record<string, HtmlBlockRenderer> = {}

for (const [name, renderer] of Object.entries(genericHtmlStringRenderers)) {
  genericHtmlRenderers[name] = (node, ctx) => {
    const result = renderer(node, ctx)
    if (isPromiseLike(result)) {
      throw new Error(`HTML renderer for "${name}" returned a Promise from a synchronous target.`)
    }
    return result
  }
}
