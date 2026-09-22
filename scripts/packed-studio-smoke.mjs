// Copied into each isolated consumer so imports resolve installed tarballs.
import assert from 'node:assert/strict'
import { startStudio } from '@contentbit/studio'

const server = await startStudio({
  cwd: process.cwd(),
  globs: ['content/**/*.md'],
  registryPath: './blocks/registry.ts',
  port: 0,
  open: false,
})

async function get(path) {
  const response = await fetch(new URL(path, server.url), { signal: AbortSignal.timeout(30_000) })
  assert.equal(response.status, 200, `${path}: ${await response.clone().text()}`)
  return response
}

try {
  const dashboard = await (await get('/')).text()
  assert(dashboard.includes('Content dashboard'), 'installed Studio dashboard failed to render')
  const project = await (await get('/api/project')).json()
  assert(project.files.length > 0, 'installed Studio found no content')
  const graph = await (await get('/api/graph')).json()
  assert(graph.nodes.length > 0, 'installed Studio found no link graph')
  for (const file of project.files) {
    const document = await (
      await get(`/api/document?path=${encodeURIComponent(file.relativePath)}`)
    ).json()
    assert(document.previewHtml.length > 0, `empty preview: ${file.relativePath}`)
    if (process.argv.includes('--quote') && file.blockNames.quote) {
      assert(
        !document.previewHtml.includes('data-cb-custom="quote"'),
        `quote fallback: ${file.relativePath}`,
      )
      assert(
        document.previewHtml.includes('<figure'),
        `quote renderer missing: ${file.relativePath}`,
      )
    }
    if (process.argv.includes('--styled')) {
      assert(
        !document.previewHtml.includes('data-cb-custom='),
        `styled block fallback: ${file.relativePath}`,
      )
      assert(
        document.previewHtml.includes('data-cb-styled'),
        `styled preview missing: ${file.relativePath}`,
      )
    }
  }
  console.log(
    `[packed] installed Studio rendered dashboard, graph, and ${project.files.length} previews`,
  )
} finally {
  await server.close()
}
