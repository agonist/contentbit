// Bundle the Studio server entry so internal workspace modules stay internal.
// Runtime package dependencies remain external; @contentbit/project is bundled.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/server/index.js',
  external: [
    'node:*',
    '@contentbit/blocks',
    '@contentbit/core',
    '@contentbit/react',
    'react',
    'react-dom',
    'react-markdown',
    'remark-gfm',
    'tinyglobby',
    'vite',
  ],
})
