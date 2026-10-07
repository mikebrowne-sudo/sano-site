import Link from 'next/link'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser, isFinanceUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { reconcile, type ReconInvoice } from '@/lib/bank-reconcile'
import { payerKey, referencedNumbers, sameDocNumber, suggestCreditMatches, type ArHistory, type ArInvoice } from '@/lib/auto-reconcile'
import { getReconcileData, type UninvoicedJob } from './_data'
import { Uploader } from './_components/Uploader'
import { AutoReconcileButton } from './_components/AutoReconcileButton'
import { ReverseDebitLink } from './_components/ReverseDebitLink'
import { ClearToggle } from './_components/ClearToggle'
import { MatchPanel, type MatchInvoice, type PanelSuggestion } from './_components/MatchPanel'
import { ConfirmMatch } from './_components/ConfirmMatch'
import { RowMenu, MenuSection } from './_components/RowMenu'
import { cleanPayee as stripPayeePrefix } from '@/lib/payee-match'
import { ReverseAllocation } from './_components/ReverseAllocation'
import clsx from 'clsx'

const STATUS_ORDER: Record<string, number> = { sent: 0, draft: 1, paid: 2 }

interface CreditAssist {
  candidates: MatchInvoice[]
  allCandidates: MatchInvoice[]
  suggestions: PanelSuggestion[]
  scoped: boolean
  /** Who the payer resolved to, for the picker heading. */
  scopeLabel: string
  /** First suggestion is safe to one-click (not a mere same-amount guess). */
  confirmable: boolean
  notes: string[]
  /** This customer's (or the quoted) jobs that have no invoice yet. */
  jobs: UninvoicedJob[]
}

const toMatchInvoice = (i: ReconInvoice): MatchInvoice => ({
  id: i.id, number: i.invoiceNumber, total: i.total, status: i.status,
  address: i.address ?? '', client: i.billTo || i.clientLabel || i.client || '',
  allocated: i.allocatedTotal ?? 0, serviceDate: i.serviceDate ?? null,
})
// Open invoices first, then most recent job first.
const byStatusThenDate = (a: ReconInvoice, b: ReconInvoice) =>
  (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
  || (b.serviceDate ?? b.dateIssued ?? '').localeCompare(a.serviceDate ?? a.dateIssued ?? '')

/**
 * Who paid, their jobs/invoices, and the ranked likely matches for one credit.
 * The payer is resolved from the payee/memo (name + branch) and from payers
 * learned on earlier matches; the picker lists that customer's invoices, with
 * every client still reachable through search / "show all".
 */
function buildAssist(
  credit: { id: string; date: string; amount: number; payee: string; memo: string; allocated: number },
  invoices: ReconInvoice[],
  arInvoices: ArInvoice[],
  history: ArHistory[],
  allCandidates: MatchInvoice[],
  uninvoicedJobs: UninvoicedJob[],
): CreditAssist {
  const { clientIds, suggestions, notes } = suggestCreditMatches({ credit: { ...credit, cleared: false }, invoices: arInvoices, history })
  const scoped = clientIds.length > 0
  // Jobs never invoiced that this payment may be for: quoted by number in the
  // bank text (QUO-0491 → JOB-0491), or done for the customer who paid.
  const refs = referencedNumbers(`${credit.payee} ${credit.memo}`)
  const jobs = uninvoicedJobs.filter((j) =>
    refs.some((r) => sameDocNumber(r, j.jobNumber) || (!!j.quoteNumber && sameDocNumber(r, j.quoteNumber)))
    || (!!j.clientId && clientIds.includes(j.clientId) && j.status === 'completed'),
  ).slice(0, 4)
  const pool = scoped
    ? invoices.filter((i) => i.clientId && clientIds.includes(i.clientId) && i.status !== 'cancelled')
    : invoices.filter((i) => i.status === 'sent')
  const labels = Array.from(new Set(pool.map((i) => i.clientLabel ?? '').filter(Boolean)))
  return {
    candidates: [...pool].sort(byStatusThenDate).slice(0, 40).map(toMatchInvoice),
    allCandidates,
    suggestions: suggestions.map((sg) => ({ label: sg.label, allocations: sg.allocations })),
    scoped,
    scopeLabel: labels.length === 1 ? labels[0] : labels.length > 1 ? `${labels.length} linked clients` : '',
    confirmable: !!suggestions[0] && suggestions[0].kind !== 'amount_only',
    notes,
    jobs,
  }
}

export const dynamic = 'force-dynamic'

/** Readable payee: drop ASB prefixes like "D/C FROM" / "PMT TO FC12-3051-…". */
function cleanPayee(raw: string): string {
  const s = stripPayeePrefix(raw).replace(/^(from|pmt to)\s+/i, '').replace(/^fc[\d-]+\s*/i, '').trim()
  return s ? s.replace(/\b([a-z])/g, (ch) => ch.toUpperCase()) : raw
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}


export default async function ReconcilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()
  const canEdit = isAdminUser(user) // accountants are read-only

  const { transactions, meta, invoices, expenses, paymentRecords, uninvoicedJobs } = await getReconcileData()
  const result = reconcile({ transactions, invoices, expenses, paymentRecords })
  const s = result.summary
  const hasData = transactions.length > 0

  // Likely matches for every credit still needing action — so most lines are a
  // one-click Confirm (incl. part payments) instead of a hunt.
  const arInvoices: ArInvoice[] = invoices.map((i) => ({
    id: i.id, number: i.invoiceNumber, status: i.status, total: i.total, allocated: i.allocatedTotal ?? 0,
    dateIssued: i.dateIssued ?? null, datePaid: i.datePaid, clientId: i.clientId ?? null, clientLabel: i.clientLabel ?? '',
    altNumbers: i.altNumbers ?? [],
  }))
  const invById = new Map(invoices.map((i) => [i.id, i]))
  // Payers learned from earlier matches: bank payee → the client it paid.
  const history: ArHistory[] = []
  for (const t of transactions) {
    for (const a of meta.get(t.uniqueId)?.allocations ?? []) {
      const clientId = invById.get(a.invoiceId)?.clientId
      if (clientId) history.push({ payerKey: payerKey(t.payee), clientId })
    }
  }
  const allCandidates = invoices.filter((i) => i.status !== 'cancelled').sort(byStatusThenDate).map(toMatchInvoice)
  const creditMatch = new Map<string, CreditAssist>()
  for (const c of result.credits) {
    const m = meta.get(c.txn.uniqueId)
    if (!m || m.cleared || c.status === 'reconciled' || c.status === 'financing') continue
    creditMatch.set(c.txn.uniqueId, buildAssist(
      { id: m.id, date: c.txn.date, amount: c.txn.amount, payee: c.txn.payee, memo: c.txn.memo, allocated: m.allocatedTotal },
      invoices, arInvoices, history, allCandidates, uninvoicedJobs,
    ))
  }

  // A line is "done" when it needs nothing from us: an auto-reconciled credit
  // / recorded debit, OR one we've manually ticked Clear. Done lines drop out
  // of the main worklist into a collapsible "Done" section — so the page shows
  // only what still needs action. Totals above stay over every transaction.
  const isCleared = (uid: string) => !!meta.get(uid)?.cleared
  const isCreditDone = (c: (typeof result.credits)[number]) => c.status === 'reconciled' || isCleared(c.txn.uniqueId)
  // A debit already recorded as a remittance / pay run has nothing left to do,
  // so it drops off the to-do list just like a cleared or linked line.
  const isDebitDone = (d: (typeof result.debits)[number]) =>
    d.status === 'recorded' || d.status === 'already_paid_elsewhere' || isCleared(d.txn.uniqueId)
    || (meta.get(d.txn.uniqueId)?.debitLinks.length ?? 0) > 0
  const creditsOut = result.credits.filter((c) => !isCreditDone(c))
  const creditsDone = result.credits.filter(isCreditDone)
  const debitsOut = result.debits.filter((d) => !isDebitDone(d))
  const debitsDone = result.debits.filter(isDebitDone)

  // Short, scannable text for the Match column.
  const listNumbers = (nums: string[]) => (nums.length <= 2 ? nums.join(', ') : `${nums[0]} +${nums.length - 1}`)

  const renderCreditRow = (c: (typeof result.credits)[number], i: number) => {
    const m = meta.get(c.txn.uniqueId)
    const cm = creditMatch.get(c.txn.uniqueId)
    const best = cm?.confirmable ? cm.suggestions[0] : null
    const bestNumbers = best ? best.allocations.map((a) => invById.get(a.invoiceId)?.invoiceNumber ?? '?') : []
    const partial = !!best && best.allocations.some((a) => {
      const inv = invById.get(a.invoiceId)
      return !!inv && a.amount < inv.total - (inv.allocatedTotal ?? 0) - 0.005
    })
    const job = cm?.jobs[0]
    const done = !cm
    const doubleWarning = !!cm?.notes.some((n) => n.includes('already paid in full'))
    // IRD refunds / owner money: ticking off IS the answer, so make it the primary action.
    const notIncome = !!cm?.notes.some((n) => n.startsWith('From IRD') || n.startsWith('Owner'))

    // One status per row, in plain words.
    const status: { label: string; tone: string } =
      done ? { label: c.status === 'financing' ? 'Owner / transfer' : 'Reconciled', tone: 'bg-emerald-50 text-emerald-700' }
      : best && partial ? { label: 'Part payment', tone: 'bg-amber-50 text-amber-700' }
      : best ? { label: best.allocations.length > 1 ? 'Likely bundle' : 'Likely match', tone: 'bg-sky-50 text-sky-700' }
      : job && job.price != null && c.txn.amount < job.price - 0.005 ? { label: 'Part payment', tone: 'bg-amber-50 text-amber-700' }
      : job ? { label: 'Job not invoiced', tone: 'bg-amber-50 text-amber-700' }
      : doubleWarning ? { label: 'Check', tone: 'bg-red-50 text-red-700' }
      : notIncome ? { label: 'Not income', tone: 'bg-sage-100 text-sage-600' }
      : { label: 'No match', tone: 'bg-gray-100 text-gray-600' }

    // What it matches (or matched).
    const matchText =
      m && m.allocations.length > 0 ? listNumbers(m.allocations.map((a) => a.invoiceNumber))
      : best ? listNumbers(bestNumbers) + (partial ? ' (part)' : '')
      : job ? job.jobNumber
      : '—'
    const autoMatched = !!m?.allocations.some((a) => a.matchReason?.startsWith('auto:'))

    return (
      <tr key={`${c.txn.uniqueId}-${i}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
        <Td className="whitespace-nowrap text-sage-500">{fmtDate(c.txn.date)}</Td>
        <Td>
          <div className="truncate font-medium text-sage-800" title={c.txn.payee}>{cleanPayee(c.txn.payee)}</div>
          {c.txn.memo && <div className="truncate text-xs text-sage-400" title={c.txn.memo}>{c.txn.memo}</div>}
        </Td>
        <Td>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-sage-700" title={best?.label ?? matchText}>{matchText}</span>
            {autoMatched && <span className="shrink-0 rounded bg-sage-100 px-1 text-[10px] font-semibold uppercase text-sage-500">auto</span>}
          </div>
        </Td>
        <Td><Badge tone={status.tone}>{status.label}</Badge></Td>
        <Td className="text-right font-medium tabular-nums whitespace-nowrap">{fmt(c.txn.amount)}</Td>
        <Td className="overflow-visible">
          <div className="flex items-center justify-end gap-1.5">
            {canEdit && m && cm && best && (
              <ConfirmMatch lineId={m.id} date={c.txn.date} suggestion={{ label: best.label, allocations: best.allocations, numbers: bestNumbers, partial }} />
            )}
            {canEdit && m && cm && !best && job && (
              <Link href={`/portal/jobs/${job.id}`} className="inline-flex h-7 items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 whitespace-nowrap">Invoice job</Link>
            )}
            {canEdit && m && cm && notIncome && <ClearToggle id={m.id} cleared={m.cleared} variant="button" />}
            {canEdit && m && cm && !best && !job && !notIncome && (
              <MatchPanel
                lineId={m.id}
                amount={round2(c.txn.amount - m.allocatedTotal)}
                date={c.txn.date}
                payee={`${c.txn.payee} ${c.txn.memo}`.trim()}
                candidates={cm.candidates}
                allCandidates={cm.allCandidates}
                scoped={cm.scoped}
                scopeLabel={cm.scopeLabel}
                suggestions={cm.suggestions}
                triggerLabel="Match"
              />
            )}
            {m && (
              <RowMenu attention={!!cm && (cm.notes.length > 0 || cm.jobs.length > 0)}>
                {best && (
                  <MenuSection title="Suggested">
                    <p>{best.label}</p>
                    {best.allocations.map((a, k) => (
                      <p key={a.invoiceId} className="flex justify-between text-xs text-sage-500"><span>{bestNumbers[k]}</span><span className="tabular-nums">{fmt(a.amount)}</span></p>
                    ))}
                  </MenuSection>
                )}
                {cm && cm.jobs.length > 0 && (
                  <MenuSection title="Not invoiced yet">
                    {job && job.price != null && c.txn.amount < job.price - 0.005 && (
                      <p className="text-xs text-amber-800">Paid {fmt(c.txn.amount)} of {fmt(job.price)}. Invoice the job, then Confirm the part payment here.</p>
                    )}
                    {cm.jobs.map((j) => (
                      <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between rounded-md px-1 py-1 hover:bg-sage-50">
                        <span>{j.jobNumber}{j.quoteNumber ? <span className="text-sage-400"> · {j.quoteNumber}</span> : null}<span className="block text-xs text-sage-400">{j.status}{j.date ? ` · ${fmtDate(j.date)}` : ''}</span></span>
                        <span className="text-xs font-semibold text-sage-600">Invoice →</span>
                      </Link>
                    ))}
                  </MenuSection>
                )}
                {cm && cm.notes.length > 0 && (
                  <MenuSection title="Note">
                    {cm.notes.map((n, k) => <p key={k} className="text-xs leading-snug text-amber-800">{n}</p>)}
                  </MenuSection>
                )}
                {m.allocations.length > 0 && (
                  <MenuSection title="Matched to">
                    {m.allocations.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <span title={a.matchReason ?? undefined}>{a.invoiceNumber}{a.matchReason?.startsWith('auto:') ? <span className="text-sage-400"> · auto</span> : null}</span>
                        <span className="flex items-center gap-2 tabular-nums">{fmt(a.amount)}{canEdit && <ReverseAllocation allocationId={a.id} invoiceNumber={a.invoiceNumber} amount={a.amount} />}</span>
                      </div>
                    ))}
                  </MenuSection>
                )}
                {canEdit && (
                  <MenuSection>
                    {cm && (best || job) && (
                      <MatchPanel
                        lineId={m.id}
                        amount={round2(c.txn.amount - m.allocatedTotal)}
                        date={c.txn.date}
                        payee={`${c.txn.payee} ${c.txn.memo}`.trim()}
                        candidates={cm.candidates}
                        allCandidates={cm.allCandidates}
                        scoped={cm.scoped}
                        scopeLabel={cm.scopeLabel}
                        suggestions={cm.suggestions}
                        triggerLabel="Choose invoices…"
                        triggerClassName="flex w-full items-center rounded-md px-1 py-1 text-left text-sm text-sage-700 hover:bg-sage-50"
                      />
                    )}
                    <ClearToggle id={m.id} cleared={m.cleared} />
                  </MenuSection>
                )}
              </RowMenu>
            )}
          </div>
        </Td>
      </tr>
    )
  }

  const renderDebitRow = (d: (typeof result.debits)[number], i: number) => {
    const m = meta.get(d.txn.uniqueId)
    const links = m?.debitLinks ?? []
    const isDone = d.status === 'recorded' || d.status === 'already_paid_elsewhere' || !!m?.cleared || links.length > 0
    const matchText =
      links.length > 0 ? (links.length === 1 ? links[0].label : `${links[0].label} +${links.length - 1}`)
      : d.status === 'already_paid_elsewhere' && d.paymentRecord ? d.paymentRecord.label
      : d.status === 'recorded' ? 'Expense on file'
      : '—'
    const status = isDone
      ? { label: links.some((l) => l.kind === 'internal_transfer') ? 'Transfer' : d.status === 'already_paid_elsewhere' || links.some((l) => l.kind === 'remittance' || l.kind === 'pay_run') ? 'Paid via payroll' : 'Recorded', tone: 'bg-emerald-50 text-emerald-700' }
      : { label: 'Not recorded', tone: 'bg-amber-50 text-amber-700' }
    const addExpenseHref = `/portal/expenses/new?amount=${Math.abs(d.txn.amount)}&date=${d.txn.date}&ref=${encodeURIComponent(d.txn.memo || d.txn.payee)}&payee=${encodeURIComponent(d.txn.payee || '')}&returnTo=${encodeURIComponent('/portal/finance/reconcile')}`

    return (
      <tr key={`${d.txn.uniqueId}-${i}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
        <Td className="whitespace-nowrap text-sage-500">{fmtDate(d.txn.date)}</Td>
        <Td>
          <div className="truncate font-medium text-sage-800" title={d.txn.payee}>{cleanPayee(d.txn.payee)}</div>
          {d.txn.memo && <div className="truncate text-xs text-sage-400" title={d.txn.memo}>{d.txn.memo}</div>}
        </Td>
        <Td>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-sage-700" title={matchText}>{matchText}</span>
            {links.some((l) => l.auto) && <span className="shrink-0 rounded bg-sage-100 px-1 text-[10px] font-semibold uppercase text-sage-500">auto</span>}
          </div>
        </Td>
        <Td><Badge tone={status.tone}>{status.label}</Badge></Td>
        <Td className="text-right font-medium tabular-nums whitespace-nowrap">{fmt(Math.abs(d.txn.amount))}</Td>
        <Td className="overflow-visible">
          <div className="flex items-center justify-end gap-1.5">
            {canEdit && !isDone && (
              // `payee` is passed separately from `ref` so the expense form can
              // recognise a recurring vendor and prefill its category + GST.
              <Link href={addExpenseHref} className="inline-flex h-7 items-center rounded-md border border-gray-200 px-2.5 text-xs font-semibold text-sage-700 hover:border-sage-300 hover:bg-sage-50 whitespace-nowrap">Add expense</Link>
            )}
            {m && (
              <RowMenu>
                {links.length > 0 && (
                  <MenuSection title="Matched to">
                    {links.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
                        <span title={l.matchReason ?? undefined}>{l.label}{l.auto ? <span className="text-sage-400"> · auto</span> : null}</span>
                        <span className="flex items-center gap-2 tabular-nums">
                          {fmt(l.amount)}
                          {canEdit && l.kind !== 'remittance' && <ReverseDebitLink linkId={l.id} label={l.label} createdExpense={l.kind === 'created_expense'} />}
                          {canEdit && l.kind === 'remittance' && <Link href="/portal/finance/reconcile-out" className="text-sage-400 hover:text-sage-700 underline">undo</Link>}
                        </span>
                      </div>
                    ))}
                  </MenuSection>
                )}
                {links.length === 0 && d.status === 'already_paid_elsewhere' && d.paymentRecord && (
                  <MenuSection title="Already recorded">
                    <p className="text-xs">{d.paymentRecord.label} — don&apos;t add it as an expense.</p>
                  </MenuSection>
                )}
                {canEdit && (
                  <MenuSection>
                    <ClearToggle id={m.id} cleared={m.cleared} />
                  </MenuSection>
                )}
              </RowMenu>
            )}
          </div>
        </Td>
      </tr>
    )
  }

  const CREDIT_COLS = ['w-[6.5rem]', '', 'w-[8rem]', 'w-[8.5rem]', 'w-[7rem]', 'w-[11rem]']
  const CREDIT_HEAD = ['Date', 'From', 'Match', 'Status', 'Amount', '']
  const DEBIT_HEAD = ['Date', 'Paid to', 'Match', 'Status', 'Amount', '']

  return (
    <div className="max-w-6xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Finance</Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-2">Bank reconciliation</h1>
      <p className="text-sm text-sage-500 mb-8">Import an ASB CSV export to match bank credits against your invoices and debits against your expenses. Re-importing is safe — duplicates are skipped.</p>

      {canEdit && <Uploader />}
      {canEdit && hasData && <AutoReconcileButton />}

      {!hasData ? (
        <p className="text-sage-500 text-sm mt-8">{canEdit ? 'No bank transactions imported yet. Upload an ASB export above to get started.' : 'No bank transactions have been imported yet.'}</p>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Money in" value={fmt(s.totalIn)} tone="in" sub={`${s.creditCount} credits`} />
            <Stat label="Money out" value={fmt(s.totalOut)} tone="out" sub={`${s.debitCount} debits`} />
            <Stat label="Invoices to mark paid" value={String(s.invoicesToMarkPaid)} tone={s.invoicesToMarkPaid ? 'warn' : 'ok'} />
            <Stat label="Debits to record" value={String(s.debitsToRecord)} tone={s.debitsToRecord ? 'warn' : 'ok'} />
            <Stat label="Paid via payroll" value={String(s.debitsPaidElsewhere)} tone="ok" />
          </div>

          <Panel icon={ArrowDownLeft} title={`Money in — ${creditsOut.length} to reconcile`}>
            {creditsOut.length === 0 ? (
              <AllClear label="Every credit is reconciled. Nothing to action." />
            ) : (
              <Table head={CREDIT_HEAD} cols={CREDIT_COLS}>{creditsOut.map(renderCreditRow)}</Table>
            )}
            {creditsDone.length > 0 && (
              <DoneSection count={creditsDone.length}>
                <Table head={CREDIT_HEAD} cols={CREDIT_COLS}>{creditsDone.map(renderCreditRow)}</Table>
              </DoneSection>
            )}
          </Panel>

          <Panel icon={ArrowUpRight} title={`Money out — ${debitsOut.length} to reconcile`}>
            {debitsOut.length === 0 ? (
              <AllClear label="Every debit is recorded. Nothing to action." />
            ) : (
              <Table head={DEBIT_HEAD} cols={CREDIT_COLS}>{debitsOut.map(renderDebitRow)}</Table>
            )}
            {debitsDone.length > 0 && (
              <DoneSection count={debitsDone.length}>
                <Table head={DEBIT_HEAD} cols={CREDIT_COLS}>{debitsDone.map(renderDebitRow)}</Table>
              </DoneSection>
            )}
          </Panel>

          <p className="text-xs text-sage-400">
            Confirm accepts the suggested match; part payments leave the rest of the invoice owing. Everything else — why it
            matched, jobs not yet invoiced, undo, tick off — is in each row&apos;s <span className="font-medium">⋯</span> menu.
            Handled lines file themselves into <span className="font-medium">Done</span>.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'in' | 'out' | 'ok' | 'warn' }) {
  return (
    <div className={clsx('rounded-xl border p-4', tone === 'in' ? 'bg-emerald-50 border-emerald-100' : tone === 'warn' ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className={clsx('text-xl font-bold mt-1 tabular-nums', tone === 'in' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-sage-800')}>{value}</p>
      {sub && <p className="text-xs text-sage-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Panel({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-sage-800 mb-4"><Icon size={18} className="text-sage-400" />{title}</h2>
      <div className="overflow-x-auto md:overflow-visible">{children}</div>
    </div>
  )
}

function Table({ head, cols, children }: { head: string[]; cols?: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full min-w-[760px] md:min-w-0 table-fixed text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-sage-400">
          {head.map((h, i) => <th key={i} className={clsx('px-3 py-2 font-semibold', cols?.[i], h === 'Amount' && 'text-right')}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Td({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return <td className={clsx('px-3 py-2.5 align-middle text-sage-700 overflow-hidden', className)} title={title}>{children}</td>
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={clsx('inline-block max-w-full truncate px-2 py-0.5 rounded-full text-xs font-medium', tone)}>{children}</span>
}

function AllClear({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
      <CheckCircle2 size={16} className="shrink-0" /> {label}
    </div>
  )
}

/** Collapsible "Done" bucket — reconciled/recorded/cleared lines, tucked away
 *  by default (native <details>, no client JS). */
function DoneSection({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <details className="mt-4 border-t border-gray-100 pt-3">
      <summary className="cursor-pointer text-xs font-medium text-sage-500 hover:text-sage-700 select-none">
        Done · {count} reconciled or cleared
      </summary>
      <div className="mt-3 overflow-x-auto md:overflow-visible">{children}</div>
    </details>
  )
}
