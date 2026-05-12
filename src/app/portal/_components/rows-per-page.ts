// Phase 4E hotfix — pure utilities for the rows-per-page selector.
//
// Lives in its own non-client module so the list pages (server
// components) can import `parsePerParam` without crossing the RSC
// 'use client' boundary. The original co-location with
// <RowsPerPageSelect> caused Next.js to replace the function with a
// client-reference proxy when imported server-side, which throws when
// called during page render — that surfaced as the post-Phase-4E
// "Application error: a server-side exception has occurred." on
// /portal/{jobs,quotes,invoices}.
//
// Keep this file plain (no JSX, no React imports). It must remain
// importable from BOTH server components (pages) and client
// components (RowsPerPageSelect).

export const ROWS_PER_PAGE_OPTIONS = [25, 50, 100] as const
export type RowsPerPageOption = (typeof ROWS_PER_PAGE_OPTIONS)[number]

/** Coerces the URL ?per= param into one of the allowed page sizes.
 *  Anything invalid falls back to `defaultValue`. Returns a number
 *  that's guaranteed safe to use in `.range(from, to)`. */
export function parsePerParam(raw: string | undefined, defaultValue: number): number {
  if (!raw) return defaultValue
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return defaultValue
  if ((ROWS_PER_PAGE_OPTIONS as readonly number[]).includes(n)) return n
  return defaultValue
}
