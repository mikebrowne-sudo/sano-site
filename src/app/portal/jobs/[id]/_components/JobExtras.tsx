'use client'

// Job EXTRAS panel — work identified on a job that is not the job itself:
// a carpet clean, an oven, a window round.
//
// Four decisions per extra, in the order an operator actually makes them:
//   1. What was done      → the client reads this on the invoice
//   2. Charge the client  → additive to the job price
//   3. Who did it         → OFTEN NOT one of the job's assigned cleaners.
//                           A carpet clean is usually a specialist. The picker
//                           groups the roster first for speed but never hides
//                           the rest of the workforce behind a "more" step.
//   4. How they're paid   → Set amount by default; hourly when it genuinely is
//
// Margin is shown live while typing, because the charge and the cost are two
// fields apart and the gap is the whole point of recording an extra.
//
// Inline panel, not a modal (portal UX rule: full-page forms, large labels,
// dropdowns over typing, avoid modals).

import { useState, useTransition, useMemo } from 'react'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { addJobItem, updateJobItem, deleteJobItem, type JobItemInput } from '../_actions-items'

export interface JobExtraRow {
  id: string
  label: string
  description: string | null
  price: number | null
  contractor_id: string | null
  contractor_name: string | null
  cost_amount: number | null
  cost_basis: string | null
  cost_hours: number | null
  source: string | null
  /** Set when a contractor payable already exists for this extra. */
  payable_number: string | null
  payable_status: string | null
}

export interface ContractorOption {
  id: string
  name: string
  /** True when this contractor is on the job's worker roster. */
  onJob: boolean
  /** Their resolved hourly rate, used to prefill the hourly basis. */
  hourlyRate: number | null
}

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Number(n).toFixed(2)}`

/** Charge and cost side by side. `cost` is NEVER shown to a client — this
 *  component is portal-only. */
function MarginPill({ charge, cost }: { charge: number; cost: number }) {
  const margin = charge - cost
  const tone =
    margin < 0 ? 'bg-red-50 text-red-700'
      : margin === 0 ? 'bg-sage-50 text-sage-600'
        : 'bg-sage-50 text-sage-700'
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {margin < 0 ? 'Loss ' : 'Margin '}{money(Math.abs(margin))}
    </span>
  )
}

function ExtraForm({
  jobId,
  contractors,
  existing,
  onDone,
  onCancel,
}: {
  jobId: string
  contractors: ContractorOption[]
  existing?: JobExtraRow
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [label, setLabel] = useState(existing?.label ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '')
  const [contractorId, setContractorId] = useState(existing?.contractor_id ?? '')
  const [basis, setBasis] = useState<'fixed' | 'hourly'>(
    existing?.cost_basis === 'hourly' ? 'hourly' : 'fixed',
  )
  // For hourly the stored cost_amount is the TOTAL, so recover the rate to edit.
  const [rate, setRate] = useState(() => {
    if (existing?.cost_amount == null) return ''
    if (existing.cost_basis === 'hourly' && existing.cost_hours) {
      return String(Number((existing.cost_amount / existing.cost_hours).toFixed(2)))
    }
    return String(existing.cost_amount)
  })
  const [hours, setHours] = useState(existing?.cost_hours != null ? String(existing.cost_hours) : '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onJob = contractors.filter((c) => c.onJob)
  const others = contractors.filter((c) => !c.onJob)

  const liveCost = useMemo(() => {
    const r = Number(rate)
    if (!contractorId || !Number.isFinite(r) || r <= 0) return 0
    if (basis === 'hourly') {
      const h = Number(hours)
      return Number.isFinite(h) && h > 0 ? r * h : 0
    }
    return r
  }, [contractorId, rate, hours, basis])

  const liveCharge = Number.isFinite(Number(price)) ? Number(price) : 0

  function pickContractor(id: string) {
    setContractorId(id)
    // Prefill the hourly rate from the contractor's profile so the common case
    // needs no typing. Never overwrite a rate the operator already entered.
    if (id && basis === 'hourly' && !rate) {
      const c = contractors.find((x) => x.id === id)
      if (c?.hourlyRate != null) setRate(String(c.hourlyRate))
    }
  }

  function submit() {
    setError(null)
    const input: JobItemInput = {
      label,
      description,
      price: Number(price),
      contractorId: contractorId || null,
      costBasis: basis,
      costRate: contractorId ? Number(rate) : null,
      costHours: contractorId && basis === 'hourly' ? Number(hours) : null,
    }
    startTransition(async () => {
      const res = existing
        ? await updateJobItem(jobId, existing.id, input)
        : await addJobItem(jobId, input)
      if (res?.error) { setError(res.error); return }
      onDone()
      router.refresh()
    })
  }

  const costLocked = !!existing?.payable_number

  return (
    <div className="rounded-lg border border-sage-200 bg-sage-50/40 p-4 space-y-4">
      <div>
        <label className="block text-[13px] font-medium text-sage-800 mb-1">
          What was done
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Carpet clean — lounge & hall"
          className="w-full rounded border border-sage-200 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-[11px] text-sage-500">The client reads this on the invoice.</p>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-sage-800 mb-1">
          Details <span className="font-normal text-sage-500">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded border border-sage-200 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-sage-800 mb-1">
          Charge the client
        </label>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sage-400">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border border-sage-200 py-2 pl-7 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="border-t border-sage-200 pt-4">
        <label className="block text-[13px] font-medium text-sage-800 mb-1">
          Who did it
        </label>
        <select
          value={contractorId}
          onChange={(e) => pickContractor(e.target.value)}
          disabled={costLocked}
          className="w-full max-w-sm rounded border border-sage-200 px-3 py-2 text-sm disabled:bg-sage-50 disabled:text-sage-400"
        >
          <option value="">No one / in-house</option>
          {onJob.length > 0 && (
            <optgroup label="On this job">
              {onJob.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Other contractors">
              {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          )}
        </select>
        <p className="mt-1 text-[11px] text-sage-500">
          Often not the cleaner assigned to the job — pick whoever actually did this work.
        </p>
      </div>

      {contractorId && (
        <div>
          <label className="block text-[13px] font-medium text-sage-800 mb-2">
            How they&rsquo;re paid
          </label>
          <div className="flex gap-4 mb-3">
            {(['fixed', 'hourly'] as const).map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm text-sage-700">
                <input
                  type="radio"
                  name="cost_basis"
                  checked={basis === b}
                  onChange={() => setBasis(b)}
                  disabled={costLocked}
                />
                {b === 'fixed' ? 'Set amount' : 'Hourly'}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-[11px] text-sage-600 mb-1">
                {basis === 'fixed' ? 'Amount to pay' : 'Hourly rate'}
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sage-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  disabled={costLocked}
                  className="w-full rounded border border-sage-200 py-2 pl-7 pr-3 text-sm disabled:bg-sage-50"
                />
              </div>
            </div>

            {basis === 'hourly' && (
              <div>
                <label className="block text-[11px] text-sage-600 mb-1">Hours</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  disabled={costLocked}
                  className="w-28 rounded border border-sage-200 px-3 py-2 text-sm disabled:bg-sage-50"
                />
              </div>
            )}
          </div>

          {costLocked && (
            <p className="mt-2 text-[11px] text-amber-700">
              Already approved for pay ({existing?.payable_number}) — who does it and what
              they&rsquo;re paid can no longer change. The charge is still editable.
            </p>
          )}
        </div>
      )}

      {(liveCharge > 0 || liveCost > 0) && (
        <div className="flex items-center gap-3 rounded bg-white border border-sage-200 px-3 py-2 text-[12px] text-sage-600">
          <span>Charge {money(liveCharge)}</span>
          <span className="text-sage-300">·</span>
          <span>Cost {money(liveCost)}</span>
          <span className="text-sage-300">·</span>
          <MarginPill charge={liveCharge} cost={liveCost} />
        </div>
      )}

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded bg-sage-700 px-4 py-2 text-sm font-medium text-white hover:bg-sage-800 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : existing ? 'Save changes' : 'Add extra'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded border border-sage-200 px-4 py-2 text-sm text-sage-700 hover:bg-sage-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ExtraRow({
  jobId,
  item,
  contractors,
}: {
  jobId: string
  item: JobExtraRow
  contractors: ContractorOption[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fromQuote = item.source === 'quote'

  if (editing) {
    return (
      <ExtraForm
        jobId={jobId}
        contractors={contractors}
        existing={item}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    )
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const res = await deleteJobItem(jobId, item.id)
      if (res?.error) { setError(res.error); setConfirming(false); return }
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-sage-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-sage-900">{item.label}</span>
            {fromQuote && (
              <span
                className="rounded bg-sage-100 px-1.5 py-0.5 text-[10px] text-sage-600"
                title="Quoted up front — this charge is already inside the job price"
              >
                From quote
              </span>
            )}
            {item.payable_number && (
              <span className="rounded bg-sage-50 px-1.5 py-0.5 text-[10px] text-sage-700">
                {item.payable_status === 'paid' ? 'Paid' : 'Approved'} {item.payable_number}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 text-[12px] text-sage-500">{item.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-sage-600">
            <span className={fromQuote ? 'text-sage-400' : ''}>
              Charge {money(item.price)}
              {fromQuote && <span className="ml-1 text-[10px]">(already in job price)</span>}
            </span>
            <span className="text-sage-300">·</span>
            <span>
              {item.contractor_name
                ? <>Pay {money(item.cost_amount)} to {item.contractor_name}
                  {item.cost_basis === 'hourly' && item.cost_hours ? ` (${item.cost_hours}h)` : ''}</>
                : 'In-house — no contractor pay'}
            </span>
            {!fromQuote && item.price != null && (
              <>
                <span className="text-sage-300">·</span>
                <MarginPill charge={Number(item.price)} cost={Number(item.cost_amount ?? 0)} />
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit this extra"
            className="rounded p-1.5 text-sage-500 hover:bg-sage-50 hover:text-sage-700"
          >
            <Pencil size={13} />
          </button>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              title="Remove this extra"
              className="rounded p-1.5 text-sage-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="rounded bg-red-600 px-2 py-1 text-[11px] text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? '…' : 'Remove'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded p-1 text-sage-500 hover:bg-sage-50"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}

export default function JobExtras({
  jobId,
  items,
  contractors,
}: {
  jobId: string
  items: JobExtraRow[]
  contractors: ContractorOption[]
}) {
  const [adding, setAdding] = useState(false)

  // Only 'added' items are additive to the job price — a quoted item's charge is
  // already inside job_price. This mirrors sumJobItemCharges exactly.
  const addedCharge = items
    .filter((i) => i.source !== 'quote')
    .reduce((a, i) => a + Number(i.price ?? 0), 0)
  const totalCost = items.reduce((a, i) => a + Number(i.cost_amount ?? 0), 0)

  return (
    <section className="rounded-xl border border-sage-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-sage-900">Extras</h2>
          <p className="text-[12px] text-sage-500">
            Work on top of the job — carpet, oven, windows. Charged to the client and
            paid to whoever did it.
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded bg-sage-700 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-sage-800"
          >
            <Plus size={14} /> Add extra
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <ExtraRow key={item.id} jobId={jobId} item={item} contractors={contractors} />
        ))}

        {adding && (
          <ExtraForm
            jobId={jobId}
            contractors={contractors}
            onDone={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )}

        {items.length === 0 && !adding && (
          <p className="py-2 text-[13px] text-sage-500">
            No extras on this job.
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sage-100 pt-3 text-[12px] text-sage-600">
          <span>Added to the invoice: <strong>{money(addedCharge)}</strong></span>
          <span className="text-sage-300">·</span>
          <span>Contractor cost: {money(totalCost)}</span>
        </div>
      )}
    </section>
  )
}
