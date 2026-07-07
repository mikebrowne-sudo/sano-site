// KiwiSaver opt-out window — pure + testable.
//
// A new employee is auto-enrolled and can only opt out between day 14 and
// day 56 of starting (via a KS10). This resolves where "today" sits relative
// to that window so the portal can nudge at the right time and stop once the
// opt-out is filed.

export type KiwiSaverStatus =
  | 'no_start'       // start date not recorded yet
  | 'before_window'  // too early to opt out
  | 'in_window'      // opt out now (KS10)
  | 'after_window'   // window passed — must go via IRD
  | 'filed'          // opt-out done

export interface KiwiSaverInput {
  startDate: string | null // 'YYYY-MM-DD'
  optOutFiled: boolean
}

export interface KiwiSaverResult {
  status: KiwiSaverStatus
  windowStart: string | null // 'YYYY-MM-DD' (day 14)
  windowEnd: string | null   // 'YYYY-MM-DD' (day 56)
  daysUntilOpen: number | null
  daysLeft: number | null    // days remaining in the window
}

const DAY = 86_400_000

function toMs(d: string): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}
function toStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function kiwiSaverOptOutStatus(input: KiwiSaverInput, today: string): KiwiSaverResult {
  if (input.optOutFiled) {
    return { status: 'filed', windowStart: null, windowEnd: null, daysUntilOpen: null, daysLeft: null }
  }
  if (!input.startDate) {
    return { status: 'no_start', windowStart: null, windowEnd: null, daysUntilOpen: null, daysLeft: null }
  }

  const start = toMs(input.startDate)
  const openMs = start + 14 * DAY
  const closeMs = start + 56 * DAY
  const now = toMs(today)
  const windowStart = toStr(openMs)
  const windowEnd = toStr(closeMs)

  if (now < openMs) {
    return { status: 'before_window', windowStart, windowEnd, daysUntilOpen: Math.ceil((openMs - now) / DAY), daysLeft: null }
  }
  if (now > closeMs) {
    return { status: 'after_window', windowStart, windowEnd, daysUntilOpen: null, daysLeft: 0 }
  }
  return { status: 'in_window', windowStart, windowEnd, daysUntilOpen: 0, daysLeft: Math.floor((closeMs - now) / DAY) }
}
