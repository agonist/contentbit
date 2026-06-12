import { escapeHtml } from '@contentbit/html'
import { Marked } from 'marked'

// marked passes raw HTML through verbatim; every other contentbit target
// escapes by default, and content often comes from CMS users rather than
// trusted committers. Escaping the html tokens (block and inline) keeps the
// default pipeline XSS-safe; pass your own renderMarkdown to opt into raw
// HTML for trusted content.
const md = new Marked({
  renderer: {
    html({ text }: { text: string }): string {
      return escapeHtml(text)
    },
  },
})

/** Default prose pipeline: marked with GFM (its default), raw HTML escaped, synchronous. */
export function defaultRenderMarkdown(source: string): string {
  return md.parse(source, { async: false }) as string
}
