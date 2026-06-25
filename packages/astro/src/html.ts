import type { BlockNode } from '@contentbit/core'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function fallbackMarkdown(md: string): string {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n')
}

export function invalidBlockHtml(node: Pick<BlockNode, 'name' | 'body'>, prefix: string): string {
  return `<div class="${prefix}invalid" data-cb-invalid="${escapeHtml(node.name)}"><pre>${escapeHtml(node.body)}</pre></div>`
}

export function unrenderableBlockError(name: string): Error {
  return new Error(`Cannot render block "${name}": not validated or no component registered.`)
}
