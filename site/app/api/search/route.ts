import { source } from '@/lib/source'
import { createFromSource } from 'fumadocs-core/search/server'

// Static export: the index is prerendered to a JSON file and searched client-side.
export const revalidate = false

export const { staticGET: GET } = createFromSource(source)
