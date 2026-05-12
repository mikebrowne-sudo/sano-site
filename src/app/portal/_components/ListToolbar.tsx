// Phase 4E — shared toolbar wrapper for the operational list pages.
//
// One layout shell that owns:
//   - search input on the left (flex-1)
//   - filter dropdowns in the centre/right cluster
//   - sort dropdown
//   - any page-specific extras (clear button, future filters button)
//
// Per-page filter components (JobFilters / QuoteFilters / InvoiceFilters)
// render INNER content only and pass it into one of the slots. The
// primitive handles outer spacing + flex rhythm so every list page
// reads the same.
//
// Server component, no internal state — slots are caller-provided
// React nodes.

export interface ListToolbarProps {
  /** Search input, conventionally <SearchInput>. Renders inside a
   *  `flex-1 min-w-[200px]` cell so it expands on wide layouts and
   *  drops to its own line on narrow ones. */
  search?: React.ReactNode
  /** Filter dropdown cluster (date / contractor / etc). Multiple
   *  <ToolbarSelect> children are typical. */
  filters?: React.ReactNode
  /** Sort dropdown — separated semantically because the reference
   *  image right-aligns it from the filters. */
  sort?: React.ReactNode
  /** Page-specific tail controls (clear-filters link, future Filters
   *  popover trigger). */
  extras?: React.ReactNode
}

export function ListToolbar({ search, filters, sort, extras }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <div className="flex-1 min-w-[200px] order-1">
          {search}
        </div>
      )}
      {(filters || sort || extras) && (
        <div className="flex flex-wrap items-center gap-2 order-2">
          {filters}
          {sort}
          {extras}
        </div>
      )}
    </div>
  )
}
