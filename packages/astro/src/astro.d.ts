// Ambient declaration so plain tsc (which cannot parse .astro files) can
// type-check the test files that import components. Editors get richer types
// from the Astro language server; for tsc the component factory is enough.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js'
  const component: AstroComponentFactory
  export default component
}
