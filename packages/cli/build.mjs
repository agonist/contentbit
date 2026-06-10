// Bundle the CLI entry points into node-runnable ESM files.
// tsc handles type checking and .d.ts generation; esbuild produces the runnable output.
// All workspace deps (@content-blocks/*) are bundled in since they use moduleResolution:bundler
// and lack .js extensions in their compiled output, making them non-runnable by plain node.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/bin.ts', 'src/run.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  // Only keep true external node modules; bundle workspace deps directly.
  external: ['node:*', 'tinyglobby'],
})
