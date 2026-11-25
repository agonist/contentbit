import { expect, test } from 'vitest'

import { readContentPageFacts } from './page-facts.js'

test('configured identity fields win over the canonical field names', () => {
  const facts = readContentPageFacts(
    { slug: 'legacy', permalink: 'new-url', key: 'old', id: 'pricing', locale: 'xx', lang: 'fr' },
    { slugField: 'permalink', keyField: 'id', localeField: 'lang' },
  )

  expect(facts).toMatchObject({ slug: 'new-url', key: 'pricing', locale: 'fr' })
})
