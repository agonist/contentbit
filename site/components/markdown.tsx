import type { ComponentProps } from 'react'

import ReactMarkdown, { type ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/*
 * The host-app side of the Content Blocks contract: the library hands prose
 * segments to `renderMarkdown`, and this component turns them into React.
 * This is exactly the integration users write — see /docs/guides/markdown.
 */
const components = {
  p: ({ node: _node, ...props }: ComponentProps<'p'> & ExtraProps) => (
    <p {...props} className="leading-relaxed [&:not(:first-child)]:mt-3" />
  ),
  a: ({ node: _node, ...props }: ComponentProps<'a'> & ExtraProps) => (
    <a
      {...props}
      className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
      target="_blank"
      rel="noreferrer"
    />
  ),
  strong: ({ node: _node, ...props }: ComponentProps<'strong'> & ExtraProps) => (
    <strong {...props} className="font-semibold" />
  ),
  ul: ({ node: _node, ...props }: ComponentProps<'ul'> & ExtraProps) => (
    <ul {...props} className="my-3 list-disc space-y-1 pl-5" />
  ),
  ol: ({ node: _node, ...props }: ComponentProps<'ol'> & ExtraProps) => (
    <ol {...props} className="my-3 list-decimal space-y-1 pl-5" />
  ),
  code: ({ node: _node, ...props }: ComponentProps<'code'> & ExtraProps) => (
    <code {...props} className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]" />
  ),
  h1: ({ node: _node, ...props }: ComponentProps<'h1'> & ExtraProps) => (
    <h2 {...props} className="mt-4 mb-2 text-lg font-semibold first:mt-0" />
  ),
  h2: ({ node: _node, ...props }: ComponentProps<'h2'> & ExtraProps) => (
    <h2 {...props} className="mt-4 mb-2 text-base font-semibold first:mt-0" />
  ),
  h3: ({ node: _node, ...props }: ComponentProps<'h3'> & ExtraProps) => (
    <h3 {...props} className="mt-3 mb-1.5 text-sm font-semibold first:mt-0" />
  ),
}

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  )
}
