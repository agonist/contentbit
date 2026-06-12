/// <reference types="vitest" />
import { getViteConfig } from 'astro/config'

export default getViteConfig(
  { test: {} },
  // The dev toolbar injects data-astro-source-* attributes into rendered
  // components, which breaks exact-markup assertions in container tests.
  { devToolbar: { enabled: false } },
)
