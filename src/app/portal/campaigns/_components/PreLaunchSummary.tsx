// Plain-English pre-launch confirmation, shown before a campaign is armed.
// Server component — all values are computed on the page and passed in.

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }

export interface PreLaunchSummaryProps {
  name: string
  recipients: number
  leadGroup: string | null
  startDateDisplay: string     // e.g. "Wed 6 Aug 2026" or "as soon as armed"
  sendTimeNz: string           // "08:30"
  sendingDays: number[]
  dailyCap: number             // 0 = unlimited
  followupsEnabled: boolean
  sendingDaysNeeded: number
  completionDisplay: string | null // e.g. "Wed 13 Aug 2026" or null
}

export function PreLaunchSummary(p: PreLaunchSummaryProps) {
  const days = (p.sendingDays.length ? p.sendingDays : [1, 2, 3, 4]).map((d) => DAY_LABELS[d]).join(', ')
  const cap = p.dailyCap > 0 ? `${p.dailyCap} per day` : 'no cap (sends everything)'

  const rows: Array<[string, string]> = [
    ['Campaign', p.name],
    ['Recipients', `${p.recipients}`],
    ['Lead group', p.leadGroup || '—'],
    ['Start date', p.startDateDisplay],
    ['Send time', `${p.sendTimeNz} NZ`],
    ['Sending days', days],
    ['Daily cap', cap],
    ['Follow-up', p.followupsEnabled ? 'ON' : 'OFF'],
    ['Estimated sending days', p.sendingDaysNeeded > 0 ? `${p.sendingDaysNeeded}` : '—'],
    ['Estimated completion', p.completionDisplay || '—'],
  ]

  return (
    <div className="mb-6 rounded-xl border border-sage-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-sage-800 mb-3">Before you launch — plain-English summary</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-sage-50 py-1">
            <dt className="text-[12px] text-sage-500">{k}</dt>
            <dd className="text-sm font-medium text-sage-800 text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[12px] text-sage-500 mt-3">
        Launching arms the campaign. It sends one batch per sending day at the send time (NZ),
        best leads first, until complete. You can pause any time.
      </p>
    </div>
  )
}
