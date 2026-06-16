// Display label for a customer/account in pickers and headers.
//
// Branch accounts are entered as name + company_name (e.g.
// "Barfoot & Thompson" + "Greenlane"). We show them combined as
// "Barfoot & Thompson — Greenlane" so the branch is clear. But we don't
// duplicate when the name already carries the branch (e.g.
// "Ray White Lochores - Birkenhead") or already contains the company.
//
// Display-only — never written back to the data (no cleanup here).

export function accountLabel(name?: string | null, companyName?: string | null): string {
  const n = (name ?? '').trim()
  const co = (companyName ?? '').trim()
  if (!co) return n
  if (!n) return co
  const nl = n.toLowerCase()
  const col = co.toLowerCase()
  if (nl === col) return n
  if (nl.includes(col)) return n          // name already includes the company/branch
  if (/\s[-–—]\s/.test(n)) return n        // name already in "Company - Branch" form
  return `${n} — ${co}`
}
