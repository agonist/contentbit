/**
 * Normalize source text where it enters core: drop a leading UTF-8 byte order
 * mark and turn CRLF and lone CR line endings into LF. Every parser after this
 * splits on `\n` and matches whole lines, so Windows checkouts read the same as
 * Unix ones, and line and column numbers match what an editor shows.
 */
export function normalizeSource(source: string): string {
  return source.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}
