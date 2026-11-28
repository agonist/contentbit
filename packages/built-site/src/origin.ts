/** The scheme and host of an absolute http or https URL, without a trailing slash; undefined for anything else. */
export function httpOrigin(value: string): string | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
}
