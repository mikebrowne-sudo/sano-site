// Extra people who get a copy of every invoice email for a client
// (clients.invoice_cc_emails). Used by the manual Send panel, the recurring
// auto-send, and payment reminders, so "send Bella's invoices to her partner
// too" is set once on the client.

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

/** Split a typed list (commas, semicolons, spaces or new lines) into clean,
 *  de-duplicated addresses. Anything that isn't an email is returned in
 *  `invalid` so the form can say which one is wrong. */
export function parseCcEmails(input: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const raw of input.split(/[\s,;]+/)) {
    const e = raw.trim()
    if (!e) continue
    if (!EMAIL.test(e)) { invalid.push(e); continue }
    const key = e.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    emails.push(e)
  }
  return { emails, invalid }
}

/** The CC list for one send: the client's saved addresses plus any extras,
 *  minus the To address and duplicates. */
export function invoiceCcList(to: string, ...lists: Array<ReadonlyArray<string | null | undefined> | null | undefined>): string[] {
  const toKey = to.trim().toLowerCase()
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list ?? []) {
      const e = (raw ?? '').trim()
      const key = e.toLowerCase()
      if (!e || key === toKey || seen.has(key)) continue
      seen.add(key)
      out.push(e)
    }
  }
  return out
}
