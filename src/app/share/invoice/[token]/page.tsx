import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { buildServiceDescription, buildPricingLabel } from '@/lib/doc-helpers'
import { PayNowButton } from './_components/PayNowButton'
import { getServiceSupabase } from '@/lib/supabase-service'

export const metadata: Metadata = { robots: 'noindex, nofollow' }

// Phase 5.5.6 — share routes now read via the service-role client so we
// can drop the wide-open public RLS on `clients`. See the matching
// quote share page for the full rationale.

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PublicInvoicePage({ params, searchParams }: { params: { token: string }; searchParams: { payment?: string } }) {
  const supabase = getServiceSupabase()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, date_paid, date_issued, due_date,
      property_category, type_of_clean, frequency, scope_size,
      service_address, scheduled_clean_date, notes,
      base_price, discount, gst_included, payment_type,
      clients ( name, company_name, service_address, phone, email )
    `)
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (error || !invoice) notFound()

  const { data: items } = await supabase
    .from('invoice_items')
    .select('label, price, sort_order')
    .eq('invoice_id', invoice.id)
    .order('sort_order')

  const client = invoice.clients as unknown as { name: string; company_name: string | null; service_address: string | null; phone: string | null; email: string | null } | null
  const addons = (items ?? []).filter((a) => a.price > 0)
  const addonsTotal = addons.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const lineTotal = (invoice.base_price ?? 0) + addonsTotal - (invoice.discount ?? 0)
  const gstAmount = invoice.gst_included ? lineTotal * 3 / 23 : lineTotal * 0.15
  const subtotalExGst = invoice.gst_included ? lineTotal - gstAmount : lineTotal
  const total = invoice.gst_included ? lineTotal : lineTotal + gstAmount

  const description = buildServiceDescription(invoice)
  const pricingLabel = buildPricingLabel(invoice)
  const isCashSale = (invoice.payment_type ?? 'cash_sale') === 'cash_sale'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="share-page">
        <div className="print-page">

          <header className="print-header">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/sano-logo-print.png" alt="Sano" className="print-logo" />
            </div>
            <div className="print-meta-block">
              <div className="print-doc-number">{invoice.invoice_number}</div>
              <div className="print-doc-type">TAX INVOICE</div>
              <table className="print-meta-table">
                <tbody>
                  <tr><td className="print-meta-label">Date issued</td><td className="print-meta-value">{fmtDate(invoice.date_issued)}</td></tr>
                  <tr><td className="print-meta-label">Due date</td><td className="print-meta-value">{fmtDate(invoice.due_date)}</td></tr>
                </tbody>
              </table>
            </div>
          </header>

          <div className="print-addresses">
            <div className="print-addr">
              <div className="print-addr-label">From</div>
              <div className="print-addr-name">Sano Property Services Limited</div>
              <div className="print-addr-line">Phone: 022 394 3982</div>
              <div className="print-addr-line">Email: hello@sano.nz</div>
              <div className="print-addr-line">GST: 141-577-062</div>
            </div>
            <div className="print-addr">
              <div className="print-addr-label">To</div>
              <div className="print-addr-name">{client?.name ?? '—'}</div>
              {client?.company_name && <div className="print-addr-line">{client.company_name}</div>}
              {client?.service_address && <div className="print-addr-line">{client.service_address}</div>}
              {client?.phone && <div className="print-addr-line">Phone: {client.phone}</div>}
              {client?.email && <div className="print-addr-line">Email: {client.email}</div>}
            </div>
          </div>

          <section className="print-section">
            <h2 className="print-section-title">Service</h2>
            {description && (
              <div className="print-field">
                <div className="print-field-label">Service Description</div>
                <div className="print-field-value">{description}</div>
              </div>
            )}
            {invoice.service_address && (
              <div className="print-field">
                <div className="print-field-label">Service Address</div>
                <div className="print-field-value">{invoice.service_address}</div>
              </div>
            )}
            {invoice.scheduled_clean_date && (
              <div className="print-field">
                <div className="print-field-label">Scheduled Date</div>
                <div className="print-field-value">{fmtDate(invoice.scheduled_clean_date)}</div>
              </div>
            )}
          </section>

          <section className="print-section">
            <h2 className="print-section-title">Pricing</h2>
            <table className="print-pricing">
              <thead>
                <tr>
                  <th className="print-pricing-th" style={{ textAlign: 'left' }}>Description</th>
                  <th className="print-pricing-th" style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.base_price ?? 0) > 0 && (
                  <tr>
                    <td className="print-pricing-td">{pricingLabel}</td>
                    <td className="print-pricing-td print-amount">{fmt(invoice.base_price)}</td>
                  </tr>
                )}
                {addons.map((a, i) => (
                  <tr key={i}>
                    <td className="print-pricing-td">{a.label}</td>
                    <td className="print-pricing-td print-amount">{fmt(a.price)}</td>
                  </tr>
                ))}
                {(invoice.discount ?? 0) > 0 && (
                  <tr>
                    <td className="print-pricing-td">Discount</td>
                    <td className="print-pricing-td print-amount">-{fmt(invoice.discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="print-totals-box">
              <div className="print-totals-row"><span>Subtotal (excl. GST)</span><span>{fmt(subtotalExGst)}</span></div>
              <div className="print-totals-row"><span>GST (15%)</span><span>{fmt(gstAmount)}</span></div>
              <div className="print-totals-total"><span>Total (incl. GST)</span><span>{fmt(total)}</span></div>
            </div>
          </section>

          <section className="print-section">
            <h2 className="print-section-title">Payment Details</h2>
            <div className="print-field">
              <div className="print-field-label">Bank</div>
              <div className="print-field-value">Sano Property Services Limited</div>
            </div>
            <div className="print-field">
              <div className="print-field-label">Account Number</div>
              <div className="print-field-value">12-3627-0005597-00</div>
            </div>
            <div className="print-field">
              <div className="print-field-label">Reference</div>
              <div className="print-field-value">{invoice.invoice_number}</div>
            </div>
            <p className="print-payment-note">Please use the invoice number as your reference.</p>
          </section>

          {invoice.notes && (
            <section className="print-section">
              <h2 className="print-section-title">Notes</h2>
              <p className="print-notes">{invoice.notes}</p>
            </section>
          )}

          <section className="print-section print-terms-section">
            <h2 className="print-section-title">Terms and Conditions</h2>
            <p className="print-terms-text">
              {isCashSale
                ? 'Payment is required in full before or on the day of service, unless otherwise agreed.'
                : 'Payment is due within 14 days of invoice date, unless otherwise agreed.'}
            </p>
            <p className="print-terms-text">Please use your invoice number as the payment reference.</p>
            <p className="print-terms-text" style={{ marginTop: '12px' }}>
              By making payment you confirm acceptance of our <a href="/share/invoice-terms" target="_blank" rel="noopener noreferrer" style={{ color: '#076653', textDecoration: 'underline' }}>Service Terms</a>.
            </p>
          </section>

          {/* Payment */}
          <PayNowButton
            shareToken={params.token}
            status={invoice.status}
            datePaid={invoice.date_paid}
            paymentResult={searchParams.payment ?? null}
            total={fmt(total)}
          />

        </div>
      </div>
    </>
  )
}

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  body { margin: 0; }
  .share-page { min-height: 100vh; background: #f5f5f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 9.5pt; line-height: 1.6; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-page { max-width: 210mm; margin: 0 auto; padding: 52px 56px; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.08); }
  .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #076653; }
  .print-logo { height: 66px; width: auto; }
  .print-meta-block { text-align: right; }
  .print-doc-number { font-size: 18pt; font-weight: 700; color: #076653; margin-bottom: 2px; }
  .print-doc-type { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #999; margin-bottom: 8px; }
  .print-meta-table { font-size: 9pt; color: #555; margin-left: auto; border-spacing: 0; }
  .print-meta-table td { padding: 2px 0; }
  .print-meta-label { padding-right: 16px; color: #999; text-align: right; }
  .print-meta-value { text-align: left; }
  .print-addresses { display: flex; gap: 48px; margin-bottom: 36px; }
  .print-addr { flex: 1; }
  .print-addr-label { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #076653; margin-bottom: 6px; }
  .print-addr-name { font-weight: 600; font-size: 10.5pt; margin-bottom: 2px; }
  .print-addr-line { color: #555; font-size: 9pt; line-height: 1.6; }
  .print-section { margin-bottom: 28px; }
  .print-section-title { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #076653; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e0eae3; }
  .print-field { margin-bottom: 12px; }
  .print-field-label { font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-bottom: 2px; }
  .print-field-value { font-size: 9.5pt; color: #1a1a1a; }
  .print-payment-note { font-size: 8.5pt; color: #777; margin-top: 8px; }
  .print-pricing { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .print-pricing-th { padding: 8px 0; font-size: 7.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #999; border-bottom: 1px solid #ddd; }
  .print-pricing-td { padding: 7px 0; border-bottom: 1px solid #f0f0f0; }
  .print-amount { text-align: right; font-variant-numeric: tabular-nums; }
  .print-totals-box { margin-top: 16px; margin-left: auto; width: 260px; border: 1px solid #e0eae3; border-radius: 8px; overflow: hidden; font-size: 9pt; }
  .print-totals-row { display: flex; justify-content: space-between; padding: 8px 16px; border-bottom: 1px solid #f0f0f0; color: #555; font-variant-numeric: tabular-nums; }
  .print-totals-total { display: flex; justify-content: space-between; padding: 12px 16px; background: #e8f5e9; font-weight: 700; font-size: 12pt; color: #1a1a1a; font-variant-numeric: tabular-nums; }
  .print-notes { color: #555; font-size: 9pt; white-space: pre-wrap; }
  .print-terms-section { margin-top: 36px; }
  .print-terms-text { color: #777; font-size: 8.5pt; margin-bottom: 4px; line-height: 1.6; }
  /* Payment panel */
  .pay-panel {
    margin-top: 32px; padding: 24px; border: 2px solid #e0eae3;
    border-radius: 12px; background: #f7f9f7; text-align: center;
  }
  .pay-done {
    display: flex; align-items: flex-start; gap: 16px; text-align: left;
    border-color: #a7f3d0; background: #ecfdf5;
  }
  .pay-done-icon { color: #059669; flex-shrink: 0; margin-top: 2px; }
  .pay-done-title { font-weight: 700; font-size: 12pt; color: #065f46; margin: 0 0 4px; }
  .pay-done-sub { font-size: 9.5pt; color: #047857; margin: 0 0 2px; }
  .pay-cancelled { font-size: 9.5pt; color: #92400e; margin: 0 0 16px; }
  .pay-button {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 36px; background: #076653; color: #fff;
    font-weight: 600; font-size: 11pt; border: none; border-radius: 8px;
    cursor: pointer; transition: background 0.2s;
  }
  .pay-button:hover { background: #065f46; }
  .pay-button:disabled { opacity: 0.5; cursor: not-allowed; }
  .pay-secure { font-size: 8.5pt; color: #999; margin: 8px 0 0; }
  .pay-error { font-size: 9pt; color: #dc2626; margin: 8px 0 0; }

  @media print {
    .pay-panel { display: none; }
    .share-page { background: none; } .print-page { margin: 0; padding: 0; box-shadow: none; max-width: none; } @page { margin: 18mm 16mm; size: A4; }
  }
`
