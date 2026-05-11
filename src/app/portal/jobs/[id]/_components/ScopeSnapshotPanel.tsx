// Phase 2 cleanups (2026-05-12) — read-only display of the agreed
// scope captured at job creation.
//
// `jobs.scope_snapshot` is populated by `createJobFromQuote()` and
// `createJobAndInvoiceFromQuote()`. It's a point-in-time copy of the
// quote scope so the job stays stable when the source quote is later
// edited or superseded. Until this panel, the data was written but
// never surfaced — staff had to read the jsonb directly to see what
// was originally agreed.
//
// Intentionally read-only:
//   • No edit affordance — the snapshot is append-only by design.
//   • Falls back to a tidy "No scope snapshot recorded" message when
//     the column is null (older jobs created before Phase C, or jobs
//     created via paths that didn't snapshot).
//   • Doesn't try to merge with the live quote — that's a different
//     decision and out of scope for this panel.

import { formatCurrency } from '@/lib/format'

type ResidentialItem = {
  label?: string | null
  price?: number | null
  sort_order?: number | null
}

type CommercialScopeRow = {
  area_type?: string | null
  task_name?: string | null
  frequency_label?: string | null
  task_group?: string | null
  display_order?: number | null
}

// Mirrors the shape written by _actions-job.ts::createJobFromQuote.
// All fields optional because older snapshots and the combined-create
// path may write subsets.
export interface ScopeSnapshot {
  source_quote_id?: string | null
  source_quote_number?: string | null
  source_version_number?: number | null
  service_category?: string | null
  frequency?: string | null
  scope_size?: string | null
  estimated_hours?: number | null
  allowed_hours?: number | null
  generated_scope?: string | null
  residential_items?: ResidentialItem[] | null
  commercial_scope?: CommercialScopeRow[] | null
  created_at?: string | null
}

interface Props {
  /** Raw jsonb value from `jobs.scope_snapshot`. Accepts unknown
   *  because Supabase returns it untyped and we want one canonical
   *  type-narrowing place. */
  snapshot: unknown
}

export function ScopeSnapshotPanel({ snapshot }: Props) {
  const data = parseSnapshot(snapshot)

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <header className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-sage-800 font-semibold text-sm">Agreed scope (snapshot)</h2>
        {data?.source_quote_number ? (
          <span className="text-[11px] text-sage-500">
            From {data.source_quote_number}
            {data.source_version_number ? ` v${data.source_version_number}` : ''}
          </span>
        ) : null}
      </header>

      {!data ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <SummaryGrid data={data} />

          {data.generated_scope ? (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1.5">
                Scope description
              </h3>
              <p className="text-sm text-sage-700 whitespace-pre-wrap leading-relaxed">
                {data.generated_scope}
              </p>
            </div>
          ) : null}

          {data.residential_items && data.residential_items.length > 0 ? (
            <ResidentialItemsList items={data.residential_items} />
          ) : null}

          {data.commercial_scope && data.commercial_scope.length > 0 ? (
            <CommercialScopeList items={data.commercial_scope} />
          ) : null}

          <footer className="text-[11px] text-sage-400">
            Captured at job creation. This panel is read-only — the live
            quote may have changed since.
          </footer>
        </div>
      )}
    </section>
  )
}

function EmptyState() {
  return (
    <p className="text-sm text-sage-500">
      No scope snapshot recorded for this job. Snapshots are captured
      when a job is created from an accepted quote; jobs created
      through other paths (custom job, recurring generator) may not
      have one.
    </p>
  )
}

function SummaryGrid({ data }: { data: ScopeSnapshot }) {
  const rows: { label: string; value: string }[] = []
  if (data.service_category) {
    rows.push({ label: 'Category', value: titleCase(data.service_category) })
  }
  if (data.frequency) {
    rows.push({ label: 'Frequency', value: titleCase(data.frequency) })
  }
  if (data.scope_size) {
    rows.push({ label: 'Scope size', value: titleCase(data.scope_size) })
  }
  if (data.estimated_hours != null) {
    rows.push({ label: 'Estimated hours', value: `${data.estimated_hours}` })
  }
  if (rows.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline gap-2">
          <dt className="text-sage-500 min-w-[88px]">{r.label}</dt>
          <dd className="text-sage-800 font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ResidentialItemsList({ items }: { items: ResidentialItem[] }) {
  const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1.5">
        Line items
      </h3>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {sorted.map((item, idx) => (
          <li key={idx} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
            <span className="text-sage-700">{item.label || '(unlabelled)'}</span>
            <span className="text-sage-800 font-medium tabular-nums">
              {formatCurrency(item.price ?? null)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CommercialScopeList({ items }: { items: CommercialScopeRow[] }) {
  const sorted = [...items].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  // Group by area_type, preserving first-seen order.
  const groups = new Map<string, CommercialScopeRow[]>()
  for (const row of sorted) {
    const key = row.area_type || 'Other'
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1.5">
        Scope of works
      </h3>
      <div className="space-y-3">
        {Array.from(groups.entries()).map(([area, rows]) => (
          <div key={area} className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="bg-sage-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sage-700">
              {area}
            </div>
            <ul className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <li key={idx} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                  <span className="text-sage-700">{row.task_name || '(unnamed task)'}</span>
                  {row.frequency_label ? (
                    <span className="text-[11px] text-sage-500">{row.frequency_label}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseSnapshot(raw: unknown): ScopeSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  // Trust the runtime shape but cast carefully — fields are optional
  // so a partial snapshot still renders something useful.
  return raw as ScopeSnapshot
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
