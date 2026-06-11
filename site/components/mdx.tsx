import type { MDXComponents } from 'mdx/types'

import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'

import { Live } from './live'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Live,
    Tab,
    Tabs,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents
