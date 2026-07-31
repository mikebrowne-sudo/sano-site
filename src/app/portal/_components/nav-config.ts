// Shared nav configuration for the portal shell. Consumed by both the
// desktop sidebar and the mobile drawer in the topbar so the grouping
// stays in lockstep.
//
// Items marked `placeholder: true` render as visually disabled entries
// — no link, "Coming soon" tag. Use placeholders for sections we want
// visible in the navigation structure but haven't built yet.

import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, FileText, Receipt, Briefcase, RefreshCw, Users,
  HardHat, BookOpen, DollarSign, Wallet, Bell, Settings,
  Wallet2, UserPlus, BarChart3, Megaphone, FileSignature,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  placeholder?: boolean
  exact?: boolean // pathname === href (used for /portal root)
  finance?: boolean // visible to read-only accountant (finance) logins
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

// Restructured for clarity (Nov 2026): fewer top-level items, fat groups become
// hub pages. No route is removed — every former tab is still reachable from its
// hub or its parent (Calendar under Jobs; Accountant access / Archive under
// Settings). The sidebar carries the daily set; ⌘K reaches everything.
//
// The hub pages: /portal/pay (contractor + employee pay + records),
// /portal/reports (P&L, job margins, reconcile, tax, expenses),
// /portal/marketing (leads, campaigns, reviews).
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Operations',
    items: [
      { href: '/portal',                label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/portal/jobs',           label: 'Jobs',      icon: Briefcase },   // Calendar lives inside Jobs
      { href: '/portal/recurring-jobs', label: 'Recurring', icon: RefreshCw },
    ],
  },
  {
    heading: 'Sales & clients',
    items: [
      { href: '/portal/clients',   label: 'Clients',            icon: Users },
      { href: '/portal/quotes',    label: 'Quotes',             icon: FileText },
      { href: '/portal/invoices',  label: 'Invoices',           icon: Receipt, finance: true },
      { href: '/portal/marketing', label: 'Leads & marketing',  icon: Megaphone }, // hub: leads, campaigns, reviews
    ],
  },
  {
    heading: 'People',
    items: [
      { href: '/portal/contractors', label: 'Workforce',   icon: HardHat },  // staff + contractors
      { href: '/portal/applicants',  label: 'Applicants',  icon: UserPlus },
      { href: '/portal/training',    label: 'Training',    icon: BookOpen },
    ],
  },
  {
    heading: 'Money',
    items: [
      { href: '/portal/pay',      label: 'Pay',      icon: Wallet, finance: true },     // hub: pay run, invoices, statements, employee pay, mileage
      { href: '/portal/reports',  label: 'Reports',  icon: DollarSign, finance: true }, // hub: P&L, job margins, reconcile, tax, expenses
      { href: '/portal/expenses', label: 'Expenses', icon: Wallet2, finance: true },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/portal/settings',   label: 'Settings',    icon: Settings },  // Accountant access + Archive live inside Settings
      { href: '/portal/agreements', label: 'Agreements',  icon: FileSignature },
      { href: '/portal/alerts',     label: 'Alerts',      icon: Bell },
      { href: '/portal/analytics',  label: 'Analytics',   icon: BarChart3 },
    ],
  },
]

/** Match logic used by the active-state highlight. Exact routes (the
 *  portal root) match by equality; everything else matches by prefix so
 *  detail/nested pages keep their parent highlighted. */
// A hub highlights on its own route AND on every route it now fronts, so the
// relocated pages keep their hub lit in the sidebar.
const HUB_PREFIXES: Record<string, string[]> = {
  // Pay hub fronts contractor pay + employee pay + records.
  '/portal/pay': [
    '/portal/pay', '/portal/contractor-invoices', '/portal/contractor-statements',
    '/portal/payroll', '/portal/mileage',
  ],
  // Reports hub fronts the finance reports.
  '/portal/reports': ['/portal/reports', '/portal/finance'],
  // Marketing hub fronts leads / campaigns / reviews.
  '/portal/marketing': ['/portal/marketing', '/portal/leads', '/portal/campaigns', '/portal/reviews'],
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.placeholder) return false
  if (item.exact) return pathname === item.href

  // Hubs: active on any of the routes they now front.
  const hubPrefixes = HUB_PREFIXES[item.href]
  if (hubPrefixes) return hubPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Jobs now includes the Calendar view (folded in) — highlight on both.
  if (item.href === '/portal/jobs') {
    return pathname === '/portal/jobs' || pathname.startsWith('/portal/jobs/')
  }
  // Settings fronts its own sub-pages (Accountant access, Archive live inside it).
  if (item.href === '/portal/settings') {
    return pathname === '/portal/settings' || pathname.startsWith('/portal/settings/')
  }
  return pathname.startsWith(item.href)
}

/** Nav groups to show for a given role. `financeOnly` (read-only accountant)
 *  sees only items flagged `finance`; empty groups are dropped. Admins/staff
 *  get the full set. */
export function navGroupsFor(financeOnly: boolean): NavGroup[] {
  if (!financeOnly) return NAV_GROUPS
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => it.finance && !it.placeholder) }))
    .filter((g) => g.items.length > 0)
}
