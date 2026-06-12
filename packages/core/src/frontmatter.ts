// A YAML frontmatter block at the very start of the file: an opening ---
// fence, an optional body (empty frontmatter is legal), and a closing ---
// fence. Both fences tolerate trailing spaces/tabs, which editors and CMS
// exports routinely leave behind.
const FM_RE = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/

/**
 * Blank out a leading YAML frontmatter block so block syntax inside it is
 * never parsed as content. Every line is replaced by an empty line (the
 * newlines stay), so diagnostic positions in the remaining document are
 * unchanged. Sources without frontmatter are returned as-is.
 */
export function stripFrontmatter(source: string): string {
  const match = FM_RE.exec(source)
  if (!match) return source
  return match[0].replace(/[^\n]+/g, '') + source.slice(match[0].length)
}
