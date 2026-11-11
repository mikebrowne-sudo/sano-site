import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { getServiceSupabase } from '@/lib/supabase-service'
import { SharePdfButton } from '../../_components/SharePdfButton'
import { StatementDocument } from '@/components/document/StatementDocument'
import { loadStatementLines } from '@/lib/statement-data'
import { fmtMoney, statementTotal } from '@/lib/statements'
import { autopayLinkUrl } from '@/lib/autopay'
import { nzToday } from '@/lib/nz-date'
import { canTakeRealPayments } from '@/lib/stripe'
import { sanoPaymentDetails } from '@/lib/sano-bank-details'
import { loadStatementPayInvoices, statementCardPlan } from '@/lib/statement-pay'
import { PayNowButton } from '../../invoice/[token]/_components/PayNowButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const { data } = await getServiceSupabase()
    .from('statements')
    .select('statement_number')
    .eq('share_token', params.token)
    .maybeSingle()
  return { title: `Sano Statement - ${data?.statement_number ?? 'unknown'}`, robots: 'noindex, nofollow' }
}

/**
 * Public statement page (token-keyed, service-role read like the invoice share
 * page). Balances are live: an invoice paid since the statement went out shows
 * as paid. `?pdf=1` is the PDF render: no buttons, no links panel.
 */
export default async function PublicStatementPage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { pdf?: string; payment?: string }
}) {
  const supabase = getServiceSupabase()
  const isPdf = searchParams?.pdf === '1'

  const { data: st } = await supabase
    .from('statements')
    .select('id, statement_number, client_id, invoice_ids, include_autopay, sent_at, created_at, clients ( name, company_name, service_address, billing_address, billing_same_as_service, email, accounts_email, phone, autopay_status )')
    .eq('share_token', params.token)
    .maybeSingle()
  if (!st) notFound()

  const client = (Array.isArray(st.clients) ? st.clients[0] : st.clients) as {
    name: string | null; company_name: string | null; service_address: string | null; billing_address: string | null
    billing_same_as_service: boolean | null; email: string | null; accounts_email: string | null; phone: string | null
    autopay_status: string | null
  } | null

  const lines = await loadStatementLines(supabase, (st.invoice_ids as string[]) ?? [])
  const autopayActive = client?.autopay_status === 'active'
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  const issuedOn = nzToday(new Date((st.sent_at ?? st.created_at) as string))
  const total = statementTotal(lines)
  // Pay the whole statement by card — only when card can be offered on every
  // invoice still owing, real payments are live, and they're not on autopay.
  const plan = !isPdf && !autopayActive && canTakeRealPayments()
    ? statementCardPlan(await loadStatementPayInvoices(supabase, (st.invoice_ids as string[]) ?? []))
    : null

  const panel = isPdf ? undefined : (
    <>
    {plan && (
      <PayNowButton
        kind="statement"
        shareToken={params.token}
        status="sent"
        datePaid={null}
        paymentResult={searchParams?.payment ?? null}
        total={fmtMoney(plan.amount)}
        cardFee={plan.fee > 0 ? fmtMoney(plan.fee) : undefined}
        cardTotal={plan.fee > 0 ? fmtMoney(Math.round((plan.amount + plan.fee) * 100) / 100) : undefined}
        bankDetails={sanoPaymentDetails(st.statement_number as string)}
      />
    )}
    {!plan && searchParams?.payment === 'success' && (
      <PayNowButton kind="statement" shareToken={params.token} status="sent" datePaid={null} paymentResult="success" total={fmtMoney(total)} />
    )}
    <div className="pay-panel">
      <h3 className="pay-title">Your invoices</h3>
      <p className="pay-sub">Open any invoice to view or download it.</p>
      <dl className="pay-alt-grid">
        {lines.map((l) => (
          <div key={l.invoiceId} className="pay-alt-row">
            <dt>
              <a href={`/share/invoice/${l.shareToken}`} style={{ color: '#076653', fontWeight: 600 }}>{l.invoiceNumber}</a>
            </dt>
            <dd>{l.balance > 0 ? fmtMoney(l.balance) : 'Paid'}</dd>
          </div>
        ))}
      </dl>
      <div className="pay-amount-row">
        <span className="pay-amount-label">Total outstanding</span>
        <span className="pay-amount-value">{fmtMoney(total)}</span>
      </div>
      {st.include_autopay && !autopayActive && total > 0 && client && (
        <div className="pay-alt">
          <div className="pay-alt-divider"><span>save time</span></div>
          <p className="pay-alt-title">Set up automatic payments</p>
          <p className="pay-alt-sub">
            Each invoice we send you is then paid automatically. Choose a direct debit from your bank account (no fee) or a
            card (2.5% card fee). You enter your details yourself on Stripe&apos;s secure page.
          </p>
          <a className="pay-button" href={autopayLinkUrl(origin, st.client_id as string)}>Set up automatic payments</a>
        </div>
      )}
    </div>
    </>
  )

  return (
    <StatementDocument
      wrapper="share-page"
      statementNumber={st.statement_number as string}
      issuedOn={issuedOn}
      asAt={nzToday()}
      client={{
        name: client?.name ?? '—',
        company_name: client?.company_name ?? null,
        address: client?.billing_same_as_service === false && client?.billing_address ? client.billing_address : (client?.service_address ?? null),
        email: client?.accounts_email || client?.email || null,
        phone: client?.phone ?? null,
      }}
      lines={lines}
      autopayActive={autopayActive}
      interactiveSlot={panel}
      shareActionsSlot={isPdf ? undefined : <SharePdfButton href={`/api/share/statement/${params.token}/pdf`} />}
    />
  )
}
