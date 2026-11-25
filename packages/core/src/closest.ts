// Did-you-mean suggestions: the first candidate at the smallest Levenshtein
// distance from target, if that distance is at most a third of the target's
// length (and at least 2). A candidate only matters if it beats the best so
// far, so each one is first checked against cheap lower bounds on its
// distance, and the distance itself is only computed up to that limit.
export function closest(target: string, candidates: string[]): string | undefined {
  let best: string | undefined
  let limit = Math.max(2, Math.floor(target.length / 3))
  const counts = new Int32Array(128)
  for (let i = 0; i < target.length; i++) counts[target.charCodeAt(i) & 127]++
  // No candidate within limit is longer than target.length + limit.
  const prev = new Int32Array(target.length + limit + 2)
  const curr = new Int32Array(target.length + limit + 2)
  for (const candidate of candidates) {
    if (Math.abs(candidate.length - target.length) > limit) continue
    if (unpairedExceeds(counts, target.length, candidate, limit)) continue
    const distance = distanceWithin(target, candidate, limit, prev, curr)
    if (distance > limit) continue
    best = candidate
    if (distance === 0) break
    limit = distance - 1
  }
  return best
}

// Whether more than limit characters on one side find no equal character on
// the other, given the target's character counts. An edit pairs off at most
// one character on each side, so the distance then exceeds limit too. Codes
// share a slot modulo 128, which can only pair off more characters.
function unpairedExceeds(
  counts: Int32Array,
  targetLength: number,
  b: string,
  limit: number,
): boolean {
  const allowed = limit - Math.max(0, targetLength - b.length)
  let unpaired = 0
  let j = 0
  while (j < b.length && unpaired <= allowed) if (counts[b.charCodeAt(j++) & 127]-- <= 0) unpaired++
  for (let k = 0; k < j; k++) counts[b.charCodeAt(k) & 127]++
  return unpaired > allowed
}

// The Levenshtein distance between a and b if it is at most limit, else
// limit + 1. Reaching cell (i, j) costs at least |j - i| and finishing from it
// at least |delta - (j - i)|, so a path within limit stays on the diagonals
// where those sum to at most limit, and a row with no cell that can still
// finish within limit ends the search. The rows are scratch buffers longer
// than b.
function distanceWithin(
  a: string,
  b: string,
  limit: number,
  prevRow: Int32Array,
  currRow: Int32Array,
): number {
  const over = limit + 1
  const delta = b.length - a.length
  const slack = (limit - Math.abs(delta)) >> 1
  const low = Math.min(0, delta) - slack
  const high = Math.max(0, delta) + slack
  let prev = prevRow
  let curr = currRow
  for (let j = 0; j <= Math.min(b.length, high); j++) prev[j] = j
  if (high < b.length) prev[high + 1] = over
  for (let i = 1; i <= a.length; i++) {
    const lo = Math.max(1, i + low)
    const hi = Math.min(b.length, i + high)
    const ai = a.charCodeAt(i - 1)
    curr[lo - 1] = lo === 1 ? i : over
    let rowBest = lo === 1 ? i + Math.abs(delta + i) : over
    for (let j = lo; j <= hi; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1
      const d = Math.min(prev[j - 1] + cost, prev[j] + 1, curr[j - 1] + 1)
      curr[j] = d
      const finish = d + Math.abs(delta - j + i)
      if (finish < rowBest) rowBest = finish
    }
    if (rowBest > limit) return over
    if (hi < b.length) curr[hi + 1] = over
    const done = prev
    prev = curr
    curr = done
  }
  return Math.min(prev[b.length], over)
}
