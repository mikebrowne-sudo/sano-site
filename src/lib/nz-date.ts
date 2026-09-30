// Today's date in New Zealand ('YYYY-MM-DD'). Server code runs in UTC, and the
// daily cron fires at 21:00 UTC — 10am NZ on the 1st is still the 31st in UTC,
// so anything customer-facing (invoice issue dates) must use NZ time.
export function nzToday(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  return fmt.format(now)
}
