// Standing reminder that a received KS10 opt-out must be forwarded to IRD by the
// next payday filing (IR348). Shown on the dashboard and in the pay-run flow.
// Renders nothing when there's nothing outstanding. Presentational.

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { PendingKs10 } from '@/lib/kiwisaver-ks10-reminders'
import { ks10Urgency } from '@/lib/kiwisaver-ks10-reminders'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function Ks10IrdAlert({
  pending,
  context = 'dashboard',
}: {
  pending: PendingKs10[]
  /** 'payrun' tailors the wording to the filing moment. */
  context?: 'dashboard' | 'payrun'
}) {
  if (pending.length === 0) return null
  const anyOverdue = pending.some((p) => ks10Urgency(p.daysOutstanding) === 'overdue')
  const tone = anyOverdue
    ? 'border-red-200 bg-red-50 text-red-800'
    : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div className={`rounded-xl border px-5 py-4 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {pending.length === 1 ? 'KS10 opt-out to send to IRD' : `${pending.length} KS10 opt-outs to send to IRD`}
          </p>
          <p className="text-[13px] mt-0.5">
            {context === 'payrun'
              ? 'Include these opt-outs in this payday filing (IR348) — they must reach IRD by your next filing.'
              : 'Forward to IRD by your next payday filing (IR348), then mark it submitted on the employee’s KiwiSaver panel.'}
          </p>
          <ul className="mt-2 space-y-1">
            {pending.map((p) => (
              <li key={p.id} className="text-[13px] flex flex-wrap items-center gap-x-2">
                <Link href={`/portal/contractors/${p.id}`} className="font-medium underline underline-offset-2 hover:no-underline">
                  {p.fullName}
                </Link>
                <span className="opacity-80">
                  KS10 received {fmt(p.ks10ReceivedDate)}
                  {p.daysOutstanding != null && p.daysOutstanding > 0 ? ` · ${p.daysOutstanding} day${p.daysOutstanding === 1 ? '' : 's'} ago` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
