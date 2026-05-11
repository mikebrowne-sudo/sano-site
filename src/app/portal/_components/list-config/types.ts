// Phase 4C — list-page metadata config types.
//
// Each operational list page (jobs / quotes / invoices / clients)
// has its own `<entity>.config.ts` that declares the page's
// invariant shape: tabs, primary/secondary actions, search hint,
// rows-per-page default. The dynamic per-user pieces (which
// columns are currently visible, default sort) continue to live in
// `src/lib/portal-display-settings.ts` and the
// `/portal/settings/display` UI — this config layer sits ABOVE that,
// declaring what's POSSIBLE; display-settings declares what's
// PREFERRED.
//
// New filters / tabs / quick-actions can be added by editing the
// config without touching page render code.

import type { LucideIcon } from 'lucide-react'

export interface ListPageActionConfig {
  /** Label on the button. Kept short — appears in the page header. */
  label: string
  href: string
  /** Locked to the Button primitive's tiers. */
  variant: 'primary' | 'secondary'
  icon: LucideIcon
  /** When set, the action only renders for admin users. */
  adminOnly?: boolean
}

export interface ListPageTabConfig<TValue extends string = string> {
  value: TValue
  label: string
}

export interface ListPageConfig<TTab extends string = string> {
  /** Used in default route hrefs, aria labels, telemetry. */
  entity: 'jobs' | 'quotes' | 'invoices' | 'clients'
  /** Title rendered in <PortalPageHeader>. */
  pageTitle: string
  /** Optional subtitle. Conventionally a short one-line summary
   *  (e.g. "Live records · 100 of N"). Resolved per render by the
   *  page, not the config. */
  subtitle?: string
  /** Actions cluster on the right of the page header. Ordered
   *  primary-last so the filled button sits at the visual right. */
  actions: ListPageActionConfig[]
  /** Status tabs surfaced at the top of the list. The page maps
   *  tab `value` to its query filter. */
  tabs: readonly ListPageTabConfig<TTab>[]
  /** Default tab when no `?tab=` is set. */
  defaultTab: TTab
  /** Placeholder text for the search input. */
  searchPlaceholder?: string
  /** Max rows fetched per request. The Phase 3 perf cap. Real
   *  pagination is a future phase; today this is the silent ceiling. */
  rowsPerPage: number
}
