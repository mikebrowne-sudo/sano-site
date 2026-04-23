'use client'

// Phase 6 — version history panel.
//
// Renders the chain of versions for a quote with a lightweight diff
// summary between consecutive versions. Includes a "Restore from this
// version" action for each non-latest row (creates a new latest draft —
// non-destructive, available to all staff).

import Link from 'next/link'
import { useTransition, useState } from 'react'
import { restoreFromVersion } from '../../_actions-versioning'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '../../../_components/StatusBadge'
import { History, RotateCcw, ChevronRight } from 'lucide-react'

interface ChainRow {
  id: string
  quote_number: string
  status: string | null
  version_number: number
  version_note: string | null
  is_latest_version: boolean
  created_at: string
  base_price: number | null
  discount: number | null
  contact_name: string | null
  contact_email: string | null
  accounts_email: string | null
  client_reference: string | null
  service_address: string | null
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/** Compute a tiny human-friendly diff summary between this version and
 *  the prior one. Only the spec-approved fields:
 *  contact, address, scope row count (approximated by base_price for
 *  speed — the panel is informational, not authoritative), base_price,
 *  total. */
function diffSummary(curr: ChainRow, prev: ChainRow): string[] {
  const out: string[] = []
  const fields: Array<[keyof ChainRow, string]> = [
    ['contact_name',     'Contact name'],
    ['contact_email',    'Contact email'],
    ['accounts_email',   'Accounts email'],
    ['client_reference', 'Client reference'],
    ['service_address',  'Service address'],
  ]
  for (const [key, label] of fields) {
    if ((curr[key] ?? '') !== (prev[key] ?? '')) {
      out.push(`${label} changed`)
    }
  }
  if ((curr.base_price ?? 0) !== (prev.base_price ?? 0)) {
    out.push(`Base price ${fmtMoney(prev.base_price)} → ${fmtMoney(curr.base_price)}`)
  }
  if ((curr.discount ?? 0) !== (prev.discount ?? 0)) {
    out.push(`Discount ${fmtMoney(prev.discount)} → ${fmtMoney(curr.discount)}`)
  }
  return out
}

export function VersionHistoryPanel({
  chain,
  currentId,
}: {
  chain: ChainRow[]
  currentId: string
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (chain.length <= 1) {
    return null
  }

  const sorted = [...chain].sort((a, b) => b.version_number - a.version_number)

  function handleRestore(versionId: string) {
    setPendingId(versionId)
    setError(null)
    startTransition(async () => {
      const result = await restoreFromVersion(versionId)
      setPendingId(null)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      if ('new_quote_id' in result && result.new_quote_id) {
        router.push(`/portal/quotes/${result.new_quote_id}`)
      }
    })
  }

  return (
    <div className="bg-white border border-sage-100 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <History size={16} className="text-sage-500" />
        <h3 className="text-sm font-semibold text-sage-800">Version history</h3>
        <span className="text-xs text-sage-500">({chain.length} versions)</span>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <ol className="space-y-3">
        {sorted.map((row) => {
          const prior = chain.find((r) => r.version_number === row.version_number - 1)
          const diffs = prior ? diffSummary(row, prior) : []
          const isCurrent = row.id === currentId
          const displayNum = row.version_number > 1
            ? `${row.quote_number}-v${row.version_number}`
            : row.quote_number

          return (
            <li
              key={row.id}
              className={`border rounded-lg p-3 ${isCurrent ? 'border-sage-500 bg-sage-50/40' : 'border-sage-100'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sage-800 text-sm">v{row.version_number}</span>
                  <span className="text-xs text-sage-500">·</span>
                  <span className="text-xs text-sage-600">{displayNum}</span>
                  <StatusBadge kind="quote" status={row.status ?? 'draft'} />
                  {row.is_latest_version && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-sage-500 bg-sage-100 px-1.5 py-0.5 rounded">
                      Latest
                    </span>
                  )}
                  {isCurrent && !row.is_latest_version && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      Viewing
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isCurrent && (
                    <Link
                      href={`/portal/quotes/${row.id}`}
                      className="inline-flex items-center gap-1 text-xs text-sage-700 hover:text-sage-900 hover:underline"
                    >
                      Open <ChevronRight size={12} />
                    </Link>
                  )}
                  {!row.is_latest_version && (
                    <button
                      type="button"
                      onClick={() => handleRestore(row.id)}
                      disabled={pendingId !== null}
                      className="inline-flex items-center gap-1.5 text-xs bg-sage-100 hover:bg-sage-200 text-sage-800 font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      {pendingId === row.id ? 'Restoring…' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-1.5 text-xs text-sage-500">
                {fmtWhen(row.created_at)}
                {row.version_note && (
                  <>
                    {' · '}
                    <span className="italic">{row.version_note}</span>
                  </>
                )}
              </div>

              {diffs.length > 0 && (
                <ul className="mt-2 text-xs text-sage-700 space-y-0.5">
                  {diffs.map((d, i) => (
                    <li key={i} className="before:content-['•_'] before:text-sage-400">
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-[11px] text-sage-500">
        Restoring an older version creates a new latest draft. History is preserved — nothing is overwritten.
      </p>
    </div>
  )
}
