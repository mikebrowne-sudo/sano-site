export interface Period {
  key: string
  label: string
  from: string
  to: string
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function getPeriods(): Period[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  const thisMonthStart = new Date(y, m, 1)
  const thisMonthEnd = new Date(y, m + 1, 0)

  const lastMonthStart = new Date(y, m - 1, 1)
  const lastMonthEnd = new Date(y, m, 0)

  const threeMonthsStart = new Date(y, m - 2, 1)

  const ytdStart = new Date(y, 0, 1)

  return [
    { key: 'this_month', label: 'This month', from: toISO(thisMonthStart), to: toISO(thisMonthEnd) },
    { key: 'last_month', label: 'Last month', from: toISO(lastMonthStart), to: toISO(lastMonthEnd) },
    { key: 'last_3_months', label: 'Last 3 months', from: toISO(threeMonthsStart), to: toISO(thisMonthEnd) },
    { key: 'ytd', label: 'Year to date', from: toISO(ytdStart), to: toISO(thisMonthEnd) },
  ]
}

export function resolvePeriod(key: string | undefined, customFrom?: string, customTo?: string): { from: string; to: string } {
  if (key === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo }
  }
  const periods = getPeriods()
  const found = periods.find((p) => p.key === key)
  return found ?? periods[0]
}

export function getMonthsBetween(from: string, to: string): { month: string; label: string; from: string; to: string }[] {
  const months: { month: string; label: string; from: string; to: string }[] = []
  const start = new Date(from)
  const end = new Date(to)

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= end) {
    const monthStart = new Date(cursor)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const label = cursor.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })
    months.push({
      month: toISO(monthStart).slice(0, 7),
      label,
      from: toISO(monthStart),
      to: toISO(monthEnd),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

/** Today's date in New Zealand as 'YYYY-MM-DD' (server runs in UTC). */
export function nzToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** NZ financial year (1 April – 31 March) containing `dateIso`. */
export function financialYear(dateIso: string): Period {
  const y = Number(dateIso.slice(0, 4))
  const m = Number(dateIso.slice(5, 7))
  const start = m >= 4 ? y : y - 1
  return {
    key: `fy${start + 1}`,
    label: `FY ${start}/${String((start + 1) % 100).padStart(2, '0')} (1 Apr ${start} – 31 Mar ${start + 1})`,
    from: `${start}-04-01`,
    to: `${start + 1}-03-31`,
  }
}

/** Last completed calendar month before `dateIso`. */
export function previousMonth(dateIso: string): Period {
  let y = Number(dateIso.slice(0, 4))
  let m = Number(dateIso.slice(5, 7)) - 1
  if (m === 0) { m = 12; y -= 1 }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { key: 'prev_month', label: 'Last month', from: `${y}-${mm}-01`, to: `${y}-${mm}-${last}` }
}

/** Presets for the accountant pack: this FY, last FY, last month. */
export function accountantPackPeriods(today: string): Period[] {
  const thisFy = financialYear(today)
  const lastFy = financialYear(`${Number(thisFy.from.slice(0, 4)) - 1}-06-01`)
  return [
    { ...thisFy, key: 'fy_current', label: `This financial year — ${thisFy.label}` },
    { ...lastFy, key: 'fy_previous', label: `Last financial year — ${lastFy.label}` },
    previousMonth(today),
  ]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Resolve the accountant pack period from query params (custom wins when valid). */
export function resolveAccountantPackPeriod(today: string, key?: string | null, from?: string | null, to?: string | null): { key: string; from: string; to: string } {
  if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to) && from <= to) return { key: 'custom', from, to }
  const presets = accountantPackPeriods(today)
  const p = presets.find((x) => x.key === key) ?? presets[0]
  return { key: p.key, from: p.from, to: p.to }
}
