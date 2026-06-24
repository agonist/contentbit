import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri"

const processor = createSatteriMarkdownProcessor({
  features: {
    directive: true,
    headingAttributes: true,
    math: true,
  },
})

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const renderer = await processor
  const result = await renderer.render(markdown)
  return result.code
}
