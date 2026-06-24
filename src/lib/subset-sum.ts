// Subset-sum over invoice amounts — used to suggest which invoices make up a
// single bundled bank payment (property managers pay several invoices at once
// with no reference). Works in integer cents to avoid floating-point drift.
//
// Pure + bounded: combinations are capped at `maxItems` invoices and
// `maxResults` suggestions, and the pool is capped, so it stays fast and the
// suggestions stay sane. Single-item combos are included, which also covers
// the "amount collides across several invoices" case.

export interface SubsetItem {
  id: string
  amount: number // dollars
}

export function toCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100)
}

/**
 * Return combinations of item ids whose amounts sum exactly to `target`
 * (dollars), each combo using at most `maxItems` items. Fewer-item combos
 * come first. The pool is truncated to `maxPool` largest items for safety.
 */
export function findSubsets(
  target: number,
  items: SubsetItem[],
  { maxItems = 4, maxResults = 12, maxPool = 40 }: { maxItems?: number; maxResults?: number; maxPool?: number } = {},
): string[][] {
  const targetC = toCents(target)
  if (targetC <= 0) return []

  // Largest first → better pruning, and drop anything already over target.
  const pool = items
    .map((it) => ({ id: it.id, c: toCents(it.amount) }))
    .filter((it) => it.c > 0 && it.c <= targetC)
    .sort((a, b) => b.c - a.c)
    .slice(0, maxPool)

  const results: string[][] = []
  const pick: string[] = []

  function dfs(start: number, sum: number) {
    if (results.length >= maxResults) return
    if (sum === targetC && pick.length > 0) {
      results.push([...pick])
      return
    }
    if (pick.length >= maxItems) return
    for (let i = start; i < pool.length; i++) {
      const next = sum + pool[i].c
      if (next > targetC) continue // positive amounts → safe to skip
      pick.push(pool[i].id)
      dfs(i + 1, next)
      pick.pop()
      if (results.length >= maxResults) return
    }
  }

  dfs(0, 0)
  return results.sort((a, b) => a.length - b.length).slice(0, maxResults)
}
