// Phase 4C — Invoices list page config. See types.ts for shape rules.

import { FilePlus2 } from 'lucide-react'
import type { ListPageConfig, ListPageTabConfig } from './types'

export type InvoiceTab = 'needs_attention' | 'outstanding' | 'paid' | 'draft' | 'all'

export const INVOICE_TABS: readonly ListPageTabConfig<InvoiceTab>[] = [
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'outstanding',     label: 'Outstanding' },
  { value: 'paid',            label: 'Paid' },
  { value: 'draft',           label: 'Draft' },
  { value: 'all',             label: 'All' },
]

export const INVOICES_LIST_CONFIG: ListPageConfig<InvoiceTab> = {
  entity: 'invoices',
  pageTitle: 'Invoices',
  actions: [
    {
      label: 'Create custom invoice',
      href: '/portal/invoices/custom/new',
      variant: 'primary',
      icon: FilePlus2,
      adminOnly: true,
    },
  ],
  tabs: INVOICE_TABS,
  defaultTab: 'needs_attention',
  searchPlaceholder: 'Search invoices…',
  rowsPerPage: 100,
}
