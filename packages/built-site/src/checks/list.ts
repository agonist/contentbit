/** 'a', 'a and b', 'a, b and c', and past max items 'a, b, c and 2 more'. */
export function listOf(items: string[], max: number): string {
  const shown = items.length > max ? [...items.slice(0, max), `${items.length - max} more`] : items
  if (shown.length < 2) return shown[0] ?? ''
  return `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`
}
