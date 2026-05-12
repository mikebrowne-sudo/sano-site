'use client'

// Phase list-view-uxp-1: slim filter row for the Invoices list.
// Phase 4E — refactored to compose shared toolbar primitives so the
// three operational lists share an identical above-the-table layout.

import { useSearchParams } from 'next/navigation'
import { ListToolbar } from '../../_components/ListToolbar'
import { SearchInput, ToolbarSelect, ClearFiltersLink } from '../../_components/ToolbarControls'

const SORT_OPTIONS = [
  { value: 'created_desc',  label: 'Newest first' },
  { value: 'created_asc',   label: 'Oldest first' },
  { value: 'due_asc',       label: 'Due (soonest)' },
  { value: 'due_desc',      label: 'Due (latest)' },
  { value: 'issued_desc',   label: 'Issued (latest)' },
  { value: 'invoice_asc',   label: 'Invoice # (asc)' },
  { value: 'invoice_desc',  label: 'Invoice # (desc)' },
]

const BASE = '/portal/invoices'

export function InvoiceFilters() {
  const searchParams = useSearchParams()
  const currentSort   = searchParams.get('sort') ?? 'created_desc'
  const currentSearch = searchParams.get('q')    ?? ''

  return (
    <ListToolbar
      search={<SearchInput basePath={BASE} placeholder="Search invoices…" />}
      sort={<ToolbarSelect basePath={BASE} paramKey="sort" value={currentSort} options={SORT_OPTIONS} />}
      extras={
        <ClearFiltersLink
          basePath={BASE}
          paramKeys={['q', 'sort']}
          preserve={['tab', 'show_archived']}
          visible={!!currentSearch || currentSort !== 'created_desc'}
        />
      }
    />
  )
}
