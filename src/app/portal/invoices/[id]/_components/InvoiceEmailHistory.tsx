import type { EmailHistoryEntry } from '@/lib/invoice-email-history'
import { Panel } from '../../../_components/Panel'

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland',
  })
}

// Bottom-of-page record of every email this invoice has generated. Sends
// before tracking began aren't in the data, so an invoice that's out but has
// no send row gets a note rather than looking unsent.
export function InvoiceEmailHistory({ entries, sentBeforeTracking }: {
  entries: EmailHistoryEntry[]
  /** Invoice is sent/paid but has no recorded send — it went out before tracking started. */
  sentBeforeTracking: boolean
}) {
  return (
    <Panel>
      {sentBeforeTracking && (
        <p className="text-sm text-sage-600 pb-3 mb-1 border-b border-sage-100">
          First emailed before send tracking started (23 Oct 2026), so that send isn&apos;t listed.
        </p>
      )}
      {entries.length === 0 ? (
        !sentBeforeTracking && <p className="text-sm text-sage-500">No emails sent yet.</p>
      ) : (
        <ul className="divide-y divide-sage-100">
          {entries.map((e, i) => (
            <li key={`${e.kind}-${e.at}-${i}`} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-sage-800">{e.label}</p>
                <p className="text-sm text-sage-600 break-all">
                  To {e.to || 'unknown'}
                  {e.cc.length > 0 && <span className="text-sage-500"> · CC {e.cc.join(', ')}</span>}
                </p>
              </div>
              <p className="text-sm text-sage-500 sm:text-right shrink-0">{fmtWhen(e.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
