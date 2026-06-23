import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const starter = process.argv[2]
if (starter !== 'astro' && starter !== 'tanstack') {
  console.error('usage: node scripts/starter-smoke.mjs <astro|tanstack>')
  process.exit(1)
}

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dir = join(root, 'starter', starter)
const expectedSlugs = ['dialing-in-espresso', 'grinder-setting-notes', 'espresso-recipe-log']

function fail(message) {
  console.error(`[${starter}] ${message}`)
  process.exit(1)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function read(path) {
  return readFileSync(join(dir, path), 'utf8')
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  assert(match, 'article is missing YAML frontmatter')
  return { frontmatter: match[1], body: match[2] }
}

function frontmatterValue(frontmatter, key) {
  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim()
}

const contentDir = join(dir, 'content')
const articleFiles = readdirSync(contentDir)
  .filter((file) => file.endsWith('.md'))
  .sort()
assert(
  articleFiles.length === expectedSlugs.length,
  `expected ${expectedSlugs.length} demo articles`,
)

for (const slug of expectedSlugs) {
  const file = `${slug}.md`
  assert(articleFiles.includes(file), `missing content/${file}`)
  const { frontmatter, body } = parseFrontmatter(read(`content/${file}`))
  assert(frontmatterValue(frontmatter, 'slug') === slug, `${file} slug does not match filename`)
  assert(frontmatter.includes('linksTo:'), `${file} is missing linksTo frontmatter`)
  assert(frontmatter.includes('keywords:'), `${file} is missing keywords frontmatter`)

  const primary = frontmatter.match(/primary:\s*(.+)/)?.[1]?.trim()
  const secondary = frontmatter
    .match(/secondary:\s*\[(.+)\]/)?.[1]
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  assert(primary, `${file} is missing keywords.primary`)
  assert(secondary?.length, `${file} is missing keywords.secondary`)
  for (const keyword of [primary, ...secondary]) {
    assert(
      body.includes(keyword),
      `${file} declares keyword "${keyword}" but does not use it in body`,
    )
  }

  const inlineLinks = [...body.matchAll(/\]\(\/blog\/([^)]+)\)/g)].map((match) => match[1])
  assert(inlineLinks.length > 0, `${file} has no visible /blog/ links in its Markdown body`)
  for (const target of inlineLinks) {
    assert(expectedSlugs.includes(target), `${file} links to unknown blog slug "${target}"`)
  }
}

const linkIndex = JSON.parse(read('.contentbit/link-index.json'))
assert(
  linkIndex.pages?.length === expectedSlugs.length,
  'link index does not contain all demo pages',
)
for (const page of linkIndex.pages) {
  assert(expectedSlugs.includes(page.slug), `link index contains unexpected page "${page.slug}"`)
  assert(page.linksTo?.length === 2, `link index page "${page.slug}" should link to two demo pages`)
  assert(page.linkedFrom?.length === 2, `link index page "${page.slug}" should have two backlinks`)
}

if (starter === 'astro') {
  assert(existsSync(join(dir, 'src/pages/blog/index.astro')), 'missing /blog route')
  assert(existsSync(join(dir, 'src/pages/blog/[slug].astro')), 'missing /blog/[slug] route')
  const indexHtml = read('dist/blog/index.html')
  assert(
    indexHtml.includes('Internal linking demo'),
    'Astro /blog page did not build expected content',
  )
  for (const slug of expectedSlugs) {
    const html = read(`dist/blog/${slug}/index.html`)
    assert(html.includes('Contentbit metadata'), `${slug} page is missing metadata panel`)
    assert(html.includes('data-cb-styled'), `${slug} page is missing contentbit block UI`)
    assert(html.includes('/blog/'), `${slug} page is missing visible blog links`)
  }
} else {
  assert(existsSync(join(dir, 'src/routes/blog.index.tsx')), 'missing /blog route')
  assert(existsSync(join(dir, 'src/routes/blog.$slug.tsx')), 'missing /blog/$slug route')
  assert(existsSync(join(dir, 'dist/client')), 'TanStack client build output is missing')
  assert(existsSync(join(dir, 'dist/server/server.js')), 'TanStack server build output is missing')
  const routeTree = read('src/routeTree.gen.ts')
  assert(routeTree.includes('/blog'), 'route tree is missing /blog routes')
}

console.log(`[${starter}] starter smoke passed`)
