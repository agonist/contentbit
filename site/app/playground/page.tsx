import type { Metadata } from 'next'

import Playground from '@/components/playground'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Edit block markup and see validation + rendering live.',
}

export default function PlaygroundPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Playground />
      </main>
    </>
  )
}
