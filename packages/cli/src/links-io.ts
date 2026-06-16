import { extractFrontmatter, type LinkInput } from '@contentbit/core'
import { readFile } from 'node:fs/promises'

// Read each file's frontmatter (head only — bodies are never parsed) into the
// LinkInput shape the core link functions consume. Files with no frontmatter
// contribute an empty data object (a non-participating page).
export async function collectLinkInputs(files: string[]): Promise<LinkInput[]> {
  const inputs: LinkInput[] = []
  for (const path of files) {
    const source = await readFile(path, 'utf8')
    const fm = extractFrontmatter(source)
    inputs.push({ path, data: fm?.data ?? {} })
  }
  return inputs
}
