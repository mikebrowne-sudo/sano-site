// ASB bank CSV parser.
//
// ASB's "Export to CSV" produces a file shaped like:
//
//   Created date / time : 23 June 2026 / 18:36:55,,,,,,
//   Bank 12; Branch 3627; Account 0005597-00 (Business Account),,,,,,
//   From date 20260401,,,,,,
//   To date 20260623,,,,,,
//   Avail Bal : 6790.45 as of 20260623,,,,,,
//   Ledger Balance : 6790.45 as of 20260623,,,,,,
//   Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
//   ,,,,,,
//   3/04/2026,2026040301,CREDIT,,CREDIT,,0
//   ...
//
// We skip the metadata preamble, find the real header row, and parse each
// transaction. Amount sign carries direction (+ money in / − money out). The
// Unique Id is ASB's per-row idempotency key. Invoice numbers are extracted
// from the Payee + Memo so credits can be matched to invoices downstream.

export type TxnDirection = 'in' | 'out'

export interface BankTxn {
  uniqueId: string
  date: string // ISO yyyy-mm-dd ('' if unparseable)
  rawDate: string
  type: string // Tran Type (CREDIT, D/C, BILLPAY, D/D, TFR IN, EFTPOS, …)
  payee: string
  memo: string
  amount: number // signed: + in, − out
  direction: TxnDirection
  invoiceRefs: string[] // normalised INV-#### found in payee/memo
}

export interface ParsedAsb {
  account: string | null
  fromDate: string | null // ISO
  toDate: string | null // ISO
  transactions: BankTxn[]
  skipped: number // non-empty data lines we could not parse
}

/** Split one CSV line, honouring double-quoted fields that contain commas. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += ch
    } else if (ch === '"') {
      inQ = true
    } else if (ch === ',') {
      out.push(cur); cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

/**
 * Parse an ASB date into ISO yyyy-mm-dd. ASB exports use more than one format
 * depending on settings:
 *   - D/M/YYYY        e.g. "3/04/2026"   (day first)
 *   - YYYY/MM/DD       e.g. "2026/04/03"  (year first, slashes or dashes)
 *   - YYYYMMDD         e.g. "20260401"    (compact, used in the metadata header)
 * Returns '' if none match.
 */
export function parseAsbDate(raw: string): string {
  const t = raw.trim()

  // Year-first: 2026/04/03 or 2026-04-03
  let m = t.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  // Day-first: 3/04/2026 or 3-04-2026
  m = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`

  // Compact: 20260401 (metadata "From date" / "To date")
  m = t.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  return ''
}

/** Pull normalised invoice numbers (INV-####) out of free text. */
export function extractInvoiceRefs(text: string): string[] {
  const refs = new Set<string>()
  const re = /\binv[-\s]?0*(\d{1,6})\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    refs.add(`INV-${m[1].padStart(4, '0')}`)
  }
  return Array.from(refs)
}

export function parseAsbCsv(text: string): ParsedAsb {
  const lines = text.split(/\r\n|\r|\n/)

  let account: string | null = null
  let fromDate: string | null = null
  let toDate: string | null = null
  let headerIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const first = (cells[0] ?? '').trim()
    if (/^date$/i.test(first) && /unique id/i.test(cells[1] ?? '')) {
      headerIdx = i
      break
    }
    if (/account/i.test(first)) account = first
    const fromM = first.match(/^From date\s+(\d{8})/i)
    if (fromM) fromDate = parseAsbDate(fromM[1])
    const toM = first.match(/^To date\s+(\d{8})/i)
    if (toM) toDate = parseAsbDate(toM[1])
  }

  const transactions: BankTxn[] = []
  let skipped = 0

  if (headerIdx === -1) {
    return { account, fromDate, toDate, transactions, skipped }
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || /^,+$/.test(line.trim())) continue // blank / separator row
    const c = splitCsvLine(line)
    const rawDate = (c[0] ?? '').trim()
    const uniqueId = (c[1] ?? '').trim()
    const amountStr = (c[6] ?? '').trim()
    if (!rawDate || amountStr === '') { skipped++; continue }
    const amount = Number(amountStr.replace(/[^0-9.\-]/g, ''))
    if (!Number.isFinite(amount)) { skipped++; continue }

    const payee = (c[4] ?? '').trim()
    const memo = (c[5] ?? '').trim()
    transactions.push({
      uniqueId,
      date: parseAsbDate(rawDate),
      rawDate,
      type: (c[2] ?? '').trim(),
      payee,
      memo,
      amount,
      direction: amount < 0 ? 'out' : 'in',
      invoiceRefs: extractInvoiceRefs(`${payee} ${memo}`),
    })
  }

  return { account, fromDate, toDate, transactions, skipped }
}
