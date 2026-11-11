import type { ReactNode } from 'react'
import { DocumentLayout, type DocumentLineItem, type DocumentParty } from './DocumentLayout'
import { sanoPaymentDetails } from '@/lib/sano-bank-details'
import { fmtLongDate, fmtMoney, statementTotal, type StatementLine } from '@/lib/statements'

/**
 * Sano customer statement: the same branded document as an invoice, listing
 * the invoices outstanding on an account with one total and one bank
 * reference. Not a tax invoice — no GST breakdown; each line links to its own
 * invoice. Used by the public statement page (and its PDF).
 */
export function StatementDocument({
  wrapper,
  statementNumber,
  issuedOn,
  asAt,
  client,
  lines,
  autopayActive,
  interactiveSlot,
  shareActionsSlot,
}: {
  wrapper: 'share-page' | 'print-overlay'
  statementNumber: string
  /** NZ date the statement was sent (YYYY-MM-DD). */
  issuedOn: string
  /** NZ date the balances are shown at (today, for a live page). */
  asAt: string
  client: {
    name: string
    company_name?: string | null
    address?: string | null
    email?: string | null
    phone?: string | null
  }
  lines: StatementLine[]
  autopayActive: boolean
  interactiveSlot?: ReactNode
  shareActionsSlot?: ReactNode
}) {
  const fromParty: DocumentParty = {
    name: 'Sano Property Services Limited',
    phone: '0800 726 686',
    email: 'hello@sano.nz',
    gst: '148-387-648',
  }
  const toParty: DocumentParty = {
    name: client.name,
    company: client.company_name && client.company_name.trim().toLowerCase() !== client.name.trim().toLowerCase() ? client.company_name : null,
    address: client.address ?? null,
    email: client.email ?? null,
    phone: client.phone ?? null,
  }

  const lineItems: DocumentLineItem[] = lines.map((l) => {
    const dates = [l.dateIssued ? `Issued ${fmtLongDate(l.dateIssued)}` : null, l.dueDate ? `Due ${fmtLongDate(l.dueDate)}` : null]
      .filter(Boolean).join(' · ')
    const subBlocks: Array<{ label: string; value: string }> = []
    if (dates) subBlocks.push({ label: 'Dates', value: dates })
    if (l.balance <= 0) subBlocks.push({ label: 'Status', value: 'Paid, thank you' })
    else if (l.paid > 0) subBlocks.push({ label: 'Part paid', value: `Invoice total ${fmtMoney(l.total)}, paid ${fmtMoney(l.paid)}` })
    return {
      description: `${l.invoiceNumber} · ${l.title}`,
      subBlocks,
      amount: l.balance <= 0 ? 'Paid' : fmtMoney(l.balance),
    }
  })

  const total = statementTotal(lines)
  const owing = lines.filter((l) => l.balance > 0)
  const earliestDue = owing.map((l) => l.dueDate).filter((d): d is string => !!d).sort()[0] ?? null

  const termsBody =
    `This statement lists the invoices on your account, with balances shown as at ${fmtLongDate(asAt)}. ` +
    'It is not a tax invoice: each invoice listed is a separate tax invoice. ' +
    (autopayActive
      ? 'Your invoices are collected automatically by direct debit. '
      : `To pay everything at once, use ${statementNumber} as the payment reference; to pay one invoice on its own, use its invoice number. `) +
    'Payments made in the last few days may not show yet. Sano Property Services Limited is GST registered (GST No. 148-387-648).'

  return (
    <DocumentLayout
      wrapper={wrapper}
      kind="statement"
      meta={{
        number: statementNumber,
        dateIssuedDisplay: fmtLongDate(issuedOn),
        trailingDateLabel: 'Earliest due',
        trailingDateDisplay: earliestDue ? fmtLongDate(earliestDue) : '—',
      }}
      fromParty={fromParty}
      toParty={toParty}
      lineItems={lineItems}
      amountLabel="Balance due"
      paymentDetails={autopayActive || total <= 0 ? undefined : sanoPaymentDetails(statementNumber)}
      paymentCallout={autopayActive ? 'Collected automatically by direct debit.' : null}
      totals={{ subtotalExGstDisplay: '', gstDisplay: '', totalDisplay: fmtMoney(total) }}
      stamp={total <= 0 && lines.length > 0 ? 'Paid' : null}
      termsBody={termsBody}
      footer={{ email: 'hello@sano.nz', phone: '0800 726 686', website: 'sano.nz' }}
      interactiveSlot={interactiveSlot}
      shareActionsSlot={shareActionsSlot}
    />
  )
}
