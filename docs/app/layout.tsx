import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { RootProvider } from 'fumadocs-ui/provider/next'

import './global.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Content Blocks',
    default: 'Content Blocks',
  },
  description: 'Structured Markdown components without framework lock-in.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
