import { access, cp, mkdir } from 'node:fs/promises'

const src = new URL('../../registry/dist/r/', import.meta.url)
const dest = new URL('../public/r/', import.meta.url)
try {
  await access(src)
  await mkdir(dest, { recursive: true })
  await cp(src, dest, { recursive: true })
  console.log('copied registry items to public/r/')
} catch {
  console.warn(
    'registry/dist/r missing — run `pnpm --filter @content-blocks/registry-src build` first',
  )
}
