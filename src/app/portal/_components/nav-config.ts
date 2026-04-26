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
  Calculator, Calendar, UserCog, ArchiveRestore, LayoutTemplate,
  Wallet2, UserPlus,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  placeholder?: boolean
  exact?: boolean // pathname === href (used for /portal root)
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
      { href: '/portal/clients',               label: 'Clients',         icon: Users },
      { href: '/portal/quotes',                label: 'Quotes',          icon: FileText },
      { href: '/portal/invoices',              label: 'Invoices',        icon: Receipt },
      { href: '/portal/commercial-calculator', label: 'Commercial calc', icon: Calculator },
    ],
  },
  {
    heading: 'Workforce',
    items: [
      { href: '/portal/applicants',  label: 'Applicants',             icon: UserPlus },
      { href: '/portal/contractors', label: 'Contractors',            icon: HardHat },
      { href: '#',                   label: 'Staff',                  icon: UserCog,  placeholder: true },
      { href: '/portal/training',    label: 'Training & compliance',  icon: BookOpen },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { href: '#',                           label: 'Expenses',             icon: Wallet2,   placeholder: true },
      { href: '/portal/finance',             label: 'Profit / reports',     icon: DollarSign },
      { href: '/portal/contractor-invoices', label: 'Contractor invoices',  icon: FileInput },
      { href: '/portal/payroll',             label: 'Payroll',              icon: Wallet },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/portal/settings',         label: 'Settings',        icon: Settings },
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
      (pathname.startsWith('/portal/settings/') && !pathname.startsWith('/portal/settings/archive'))
  }
  return pathname.startsWith(item.href)
}
