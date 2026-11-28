import type { Metadata } from 'next'

import Playground from '@/components/playground'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Playground',
  alternates: { canonical: '/playground' },
  description: 'Edit block markup and see validation + rendering live.',
}

export default function PlaygroundPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <h1 className="sr-only">Contentbit playground</h1>
        <Playground />
      </main>
    </>
  )
}
