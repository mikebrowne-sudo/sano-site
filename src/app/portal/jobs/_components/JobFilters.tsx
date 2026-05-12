'use client'

// Phase 5.5.14 — slimmed-down filters for the Jobs list.
//
// Search + contractor filter + date filter (today/tomorrow shortcut)
// + sort + clear. Lifecycle tabs cover the operational slices above
// this toolbar; the legacy chip row was retired when tabs landed.
//
// Phase 4E — refactored to compose shared toolbar primitives:
//   <ListToolbar> owns the outer layout (search-left, controls-right)
//   <SearchInput> / <ToolbarSelect> / <ClearFiltersLink> own URL state
// This file is now just a thin assembly of slots so Jobs / Quotes /
// Invoices stay visually identical above the table.

import { useSearchParams } from 'next/navigation'
import { ListToolbar } from '../../_components/ListToolbar'
import { SearchInput, ToolbarSelect, ClearFiltersLink } from '../../_components/ToolbarControls'

const SORT_OPTIONS = [
  { value: 'scheduled_asc',  label: 'Scheduled (soonest)' },
  { value: 'scheduled_desc', label: 'Scheduled (latest)' },
  { value: 'created_desc',   label: 'Newest created' },
  { value: 'created_asc',    label: 'Oldest created' },
]

const DATE_OPTIONS = [
  { value: '',         label: 'Any date' },
  { value: 'today',    label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
]

const BASE = '/portal/jobs'

export function JobFilters({
  contractors,
}: {
  contractors: { id: string; full_name: string }[]
}) {
  const searchParams = useSearchParams()

  const currentView       = searchParams.get('view')       ?? ''
  const currentContractor = searchParams.get('contractor') ?? ''
  const currentSort       = searchParams.get('sort')       ?? 'scheduled_asc'
  const currentSearch     = searchParams.get('q')          ?? ''

  const contractorOptions = [
    { value: '', label: 'All contractors' },
    ...contractors.map((c) => ({ value: c.id, label: c.full_name })),
  ]

  return (
    <ListToolbar
      search={<SearchInput basePath={BASE} placeholder="Search jobs…" />}
      filters={
        <>
          <ToolbarSelect basePath={BASE} paramKey="view"       value={currentView}       options={DATE_OPTIONS} />
          <ToolbarSelect basePath={BASE} paramKey="contractor" value={currentContractor} options={contractorOptions} />
        </>
      }
      sort={<ToolbarSelect basePath={BASE} paramKey="sort" value={currentSort} options={SORT_OPTIONS} />}
      extras={
        <ClearFiltersLink
          basePath={BASE}
          paramKeys={['view', 'contractor', 'q', 'sort']}
          preserve={['tab', 'show_archived']}
          visible={!!(currentView || currentContractor || currentSearch)}
        />
      }
    />
  )
}
