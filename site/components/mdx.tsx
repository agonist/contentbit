import type { MDXComponents } from 'mdx/types'

import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'

import { AgentSession } from './agent-session'
import { Live } from './live'
import { StatsLive } from './stats-live'
import { TerminalDemo } from './terminal-demo'

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AgentSession,
    Live,
    StatsLive,
    Tab,
    Tabs,
    TerminalDemo,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents
