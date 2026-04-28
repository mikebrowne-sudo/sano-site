// Phase 5.5.16 — single source of truth for the invoice total formula.
//
// Used in five places in the app today:
//   - /portal/invoices list page
//   - /portal/invoices/[id] detail page
//   - /share/invoice/[token] (PDF + public share)
//   - /api/stripe/create-checkout
//   - the email render in /portal/invoices/[id]/_actions.ts
//
// Each surface currently re-implements the formula inline. This file
// exists so the rule is documented and unit-testable. Long-term we
// should swap the inline calculations to call this helper; in the
// short term it's also the regression test target for the
// quote $480 → job → invoice = $480 (not $960) bug.
//
// Semantic: items are ADDONS, not the full breakdown.
//   - Residential (no addons): base_price = full price, items = []
//   - Residential with addons: base_price = main service, items = extras
//   - Job-based: base_price = full price, items = [] (post-fix)
//
// Total = base_price + sum(items) - discount, floored at 0.

export interface InvoiceTotalInput {
  base_price?: number | null
  discount?: number | null
}

export interface InvoiceItem {
  price?: number | null
}

export function calculateInvoiceTotal(
  invoice: InvoiceTotalInput,
  items: InvoiceItem[],
): number {
  const base = Number(invoice.base_price ?? 0)
  const discount = Number(invoice.discount ?? 0)
  const itemsSum = items.reduce((sum, i) => sum + Number(i.price ?? 0), 0)
  return Math.max(0, base + itemsSum - discount)
}
