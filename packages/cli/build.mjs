// Bundle the CLI entry points into node-runnable ESM files.
// tsc handles type checking and .d.ts generation; esbuild produces the runnable output.
// Most workspace deps (@contentbit/*) are bundled in since they use moduleResolution:bundler
// and lack .js extensions in their compiled output, making them non-runnable by plain node.
// Studio is a full web app, so the CLI loads it as a runtime dependency instead.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/bin.ts', 'src/run.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  // Only keep true external node modules plus the Studio app runtime.
  external: ['node:*', 'tinyglobby', '@clack/prompts', '@contentbit/studio'],
})
