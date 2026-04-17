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
