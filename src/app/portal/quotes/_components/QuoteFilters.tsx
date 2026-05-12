'use client'

// Phase 4E — basic toolbar for the Quotes list. Brings Quotes into
// the same above-the-table shape as Jobs and Invoices.
//
// Scope is deliberately small: search + sort. No date / contractor
// filter because quotes don't carry those operationally. If the
// brief later asks for additional filter axes (service category,
// linked-job presence, etc.), they slot in via <ToolbarSelect>.

import { useSearchParams } from 'next/navigation'
import { ListToolbar } from '../../_components/ListToolbar'
import { SearchInput, ToolbarSelect, ClearFiltersLink } from '../../_components/ToolbarControls'

const SORT_OPTIONS = [
  { value: 'created_desc',  label: 'Newest first' },
  { value: 'created_asc',   label: 'Oldest first' },
  { value: 'date_issued_desc', label: 'Issued (latest)' },
  { value: 'date_issued_asc',  label: 'Issued (earliest)' },
  { value: 'valid_until_asc',  label: 'Expiring soonest' },
  { value: 'quote_number_asc',  label: 'Quote # (asc)' },
  { value: 'quote_number_desc', label: 'Quote # (desc)' },
]

const BASE = '/portal/quotes'

export function QuoteFilters() {
  const searchParams = useSearchParams()
  const currentSort   = searchParams.get('sort') ?? ''
  const currentSearch = searchParams.get('q')    ?? ''

  return (
    <ListToolbar
      search={<SearchInput basePath={BASE} placeholder="Search quotes…" />}
      sort={<ToolbarSelect basePath={BASE} paramKey="sort" value={currentSort || 'created_desc'} options={SORT_OPTIONS} />}
      extras={
        <ClearFiltersLink
          basePath={BASE}
          paramKeys={['q', 'sort']}
          preserve={['tab', 'show_archived']}
          visible={!!currentSearch || !!currentSort}
        />
      }
    />
  )
}
