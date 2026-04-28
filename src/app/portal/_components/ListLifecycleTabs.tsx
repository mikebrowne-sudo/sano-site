// Phase 5.5.13 — shared tab strip + show-archived/test toggle for the
// quote / job / invoice list pages. Server component (just renders
// <Link>s with the right URL params).
//
// Tabs and toggle stay in sync with the URL: each tab is a Link to
// the same route with `?tab=…&show_archived=…` so deep-linking works
// and Next.js can use partial-pre-renders.

import Link from 'next/link'
import clsx from 'clsx'
import { Archive, FlaskConical } from 'lucide-react'

export interface TabDef<T extends string = string> {
  value: T
  label: string
  count?: number
}

interface Props<T extends string> {
  basePath: string                      // '/portal/quotes' etc.
  tabs: readonly TabDef<T>[]
  activeTab: T
  showArchived: boolean
  // Pass any other URL params we want preserved (e.g. ?sort=…).
  preservedParams?: Record<string, string | undefined>
  // Phase 5.5.14 — when false, the Show-archived/test toggle is hidden.
  // The toggle is part of the cleanup-mode surface; non-admins (and
  // admins with cleanup mode disabled) should never see it.
  canCleanup?: boolean
}

function buildHref(base: string, params: Record<string, string | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v && v.length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return qs ? `${base}?${qs}` : base
}

export function ListLifecycleTabs<T extends string>({
  basePath, tabs, activeTab, showArchived, preservedParams = {}, canCleanup = false,
}: Props<T>) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <div role="tablist" className="inline-flex flex-wrap gap-1 bg-sage-50 border border-sage-100 rounded-lg p-0.5">
        {tabs.map((t) => {
          const active = t.value === activeTab
          const href = buildHref(basePath, {
            ...preservedParams,
            tab: t.value,
            show_archived: showArchived ? '1' : undefined,
          })
          return (
            <Link
              key={t.value}
              href={href}
              role="tab"
              aria-selected={active}
              className={clsx(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                active
                  ? 'bg-white text-sage-800 shadow-sm'
                  : 'text-sage-600 hover:text-sage-800 hover:bg-white/50',
              )}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span className="ml-1.5 text-[11px] text-sage-500">{t.count}</span>
              )}
            </Link>
          )
        })}
      </div>

      {canCleanup && (
        <Link
          href={buildHref(basePath, {
            ...preservedParams,
            tab: activeTab,
            show_archived: showArchived ? undefined : '1',
          })}
          className="inline-flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-800 transition-colors"
        >
          {showArchived ? (
            <>
              <Archive size={12} /> Hide archived/test
            </>
          ) : (
            <>
              <FlaskConical size={12} /> Show archived/test
            </>
          )}
        </Link>
      )}
    </div>
  )
}
