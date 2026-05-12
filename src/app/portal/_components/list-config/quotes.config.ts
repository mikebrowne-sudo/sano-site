// Phase 4C — Quotes list page config. See types.ts for shape rules.

import { Plus } from 'lucide-react'
import type { ListPageConfig, ListPageTabConfig } from './types'

export type QuoteTab = 'needs_attention' | 'sent' | 'accepted' | 'all'

export const QUOTE_TABS: readonly ListPageTabConfig<QuoteTab>[] = [
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'sent',            label: 'Sent' },
  { value: 'accepted',        label: 'Accepted' },
  { value: 'all',             label: 'All' },
]

export const QUOTES_LIST_CONFIG: ListPageConfig<QuoteTab> = {
  entity: 'quotes',
  pageTitle: 'Quotes',
  actions: [
    { label: 'New Quote', href: '/portal/quotes/new', variant: 'primary', icon: Plus },
  ],
  tabs: QUOTE_TABS,
  defaultTab: 'needs_attention',
  searchPlaceholder: 'Search quotes…',
  rowsPerPage: 100,
}
