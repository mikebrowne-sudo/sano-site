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
  HardHat, BookOpen, DollarSign, FileInput, Wallet, Bell, Settings,
  Calendar, UserCog, ArchiveRestore, LayoutTemplate,
  Wallet2, UserPlus, Scale, Landmark, BarChart3, KeyRound,
  Target, Megaphone,
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

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Core operations',
    items: [
      { href: '/portal',                label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/portal/jobs',           label: 'Jobs',      icon: Briefcase },
      { href: '/portal/jobs/calendar',  label: 'Calendar',  icon: Calendar },
      { href: '/portal/recurring-jobs', label: 'Recurring', icon: RefreshCw },
    ],
  },
  {
    heading: 'Sales & clients',
    items: [
      { href: '/portal/leads',                 label: 'Leads',           icon: Target },
      { href: '/portal/campaigns',             label: 'Campaigns',       icon: Megaphone },
      { href: '/portal/clients',               label: 'Clients',         icon: Users },
      { href: '/portal/quotes',                label: 'Quotes',          icon: FileText },
      { href: '/portal/invoices',              label: 'Invoices',        icon: Receipt, finance: true },
      // Phase 2 cleanup — legacy /portal/commercial-calculator hidden
      // from nav. Route still exists for any deep-linked bookmarks but
      // the residential + commercial quote flows have superseded it.
      // { href: '/portal/commercial-calculator', label: 'Commercial calc', icon: Calculator },
    ],
  },
  {
    heading: 'Workforce',
    items: [
      { href: '/portal/applicants',  label: 'Applicants',             icon: UserPlus },
      { href: '/portal/contractors', label: 'Contractors',            icon: HardHat },
      { href: '/portal/staff',       label: 'Staff',                  icon: UserCog },
      { href: '/portal/training',    label: 'Training & compliance',  icon: BookOpen },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { href: '/portal/expenses',            label: 'Expenses',             icon: Wallet2, finance: true },
      { href: '/portal/finance/profit-loss', label: 'P&L statement',        icon: Scale, finance: true },
      { href: '/portal/finance/reconcile',   label: 'Bank reconciliation',  icon: Landmark, finance: true },
      { href: '/portal/finance',             label: 'Profit / reports',     icon: DollarSign, finance: true },
      { href: '/portal/contractor-invoices', label: 'Contractor invoices',  icon: FileInput, finance: true },
      { href: '/portal/payroll',             label: 'Payroll',              icon: Wallet, finance: true },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/portal/analytics',        label: 'Website analytics', icon: BarChart3 },
      { href: '/portal/settings',         label: 'Settings',        icon: Settings },
      { href: '/portal/settings/accountants', label: 'Accountant access', icon: KeyRound },
      { href: '#',                        label: 'Templates',       icon: LayoutTemplate, placeholder: true },
      { href: '/portal/settings/archive', label: 'Archived records', icon: ArchiveRestore },
      { href: '/portal/alerts',           label: 'Alerts',          icon: Bell },
    ],
  },
]

/** Match logic used by the active-state highlight. Exact routes (the
 *  portal root) match by equality; everything else matches by prefix so
 *  detail/nested pages keep their parent highlighted. */
export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.placeholder) return false
  if (item.exact) return pathname === item.href
  // Calendar is nested inside /portal/jobs — keep Calendar highlighted
  // when on /portal/jobs/calendar rather than Jobs.
  if (item.href === '/portal/jobs') {
    return pathname === '/portal/jobs' ||
      (pathname.startsWith('/portal/jobs/') && !pathname.startsWith('/portal/jobs/calendar'))
  }
  // Archive is nested inside Settings — avoid double-highlight.
  if (item.href === '/portal/settings') {
    return pathname === '/portal/settings' ||
      (pathname.startsWith('/portal/settings/')
        && !pathname.startsWith('/portal/settings/archive')
        && !pathname.startsWith('/portal/settings/accountants'))
  }
  // P&L statement and Bank reconciliation are nested under /portal/finance —
  // keep "Profit / reports" from also lighting up when on those pages.
  if (item.href === '/portal/finance') {
    return pathname === '/portal/finance' ||
      (pathname.startsWith('/portal/finance/')
        && !pathname.startsWith('/portal/finance/profit-loss')
        && !pathname.startsWith('/portal/finance/reconcile'))
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
