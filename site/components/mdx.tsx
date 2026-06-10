import type { MDXComponents } from 'mdx/types'

import defaultMdxComponents from 'fumadocs-ui/mdx'

import { Live } from './live'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Live,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents
