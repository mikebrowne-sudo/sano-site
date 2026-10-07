'use client'

import { useMemo, useState, useTransition } from 'react'
import clsx from 'clsx'
import { createCampaignAction } from '../_actions'
import {
  QUALITY_RANK_BADGE,
  LEAD_STATUS_LABELS,
  type SalesLead,
} from '@/lib/campaigns/constants'

type EligibleLead = Pick<
  SalesLead,
  'id' | 'company' | 'contact_name' | 'contact_role' | 'email' | 'quality_rank' | 'status' | 'industry'
>

export function NewCampaignForm({ leads }: { leads: EligibleLead[] }) {
  const [name, setName] = useState('')
  // A/B subject test — two subjects, evenly + randomly split across recipients.
  const [subjectA, setSubjectA] = useState('Cleaning at {company}')
  const [subjectB, setSubjectB] = useState('A quick question about cleaning at {company}')
  const [description, setDescription] = useState('')
  // Sender identity — defaults to Carol so the email reads as coming from her.
  const [fromName, setFromName] = useState('Carol Browne')
  const [fromEmail, setFromEmail] = useState('carol@sano.nz')
  const [signatureName, setSignatureName] = useState('Carol Browne')
  const [replyTo, setReplyTo] = useState('carol@sano.nz')
  // Carol's hosted signature banner — the same one her real Outlook emails use,
  // so a campaign send matches her normal sign-off. Default ON.
  const CAROL_BANNER = 'https://sano.nz/email/email-banner-carol.jpg'
  const [useBanner, setUseBanner] = useState(true)
  // Sender warm-up: drip N/day instead of blasting.
  const [dailyCap, setDailyCap] = useState('15')
  const [allowUnlimited, setAllowUnlimited] = useState(false)
  // Scheduling.
  const [startDate, setStartDate] = useState('') // '' = as soon as armed
  const [sendTimeNz, setSendTimeNz] = useState('08:30')
  const WEEKDAYS = [
    { d: 1, label: 'Mon' }, { d: 2, label: 'Tue' }, { d: 3, label: 'Wed' },
    { d: 4, label: 'Thu' }, { d: 5, label: 'Fri' }, { d: 6, label: 'Sat' }, { d: 7, label: 'Sun' },
  ]
  const [sendingDays, setSendingDays] = useState<Set<number>>(new Set([1, 2, 3, 4]))
  const [selected, setSelected] = useState<Set<string>>(new Set(leads.map((l) => l.id)))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allSelected = selected.size === leads.length && leads.length > 0
  const counts = useMemo(() => {
    const c = { A: 0, B: 0, C: 0 }
    for (const l of leads) if (selected.has(l.id)) c[l.quality_rank]++
    return c
  }, [leads, selected])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const capNum = Number(dailyCap)
  const capOverWarn = capNum > 20
  const capIsZero = !(capNum > 0)

  // The predominant grade selected → the lead-group label locked at creation.
  const leadGroupLabel = useMemo(() => {
    const active = (['A', 'B', 'C'] as const).filter((g) => counts[g] > 0)
    if (active.length === 1) return `${active[0]}-grade leads`
    if (active.length > 1) return `${active.join('/')}-grade leads`
    return 'Selected leads'
  }, [counts])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Give the campaign a name.'); return }
    if (selected.size === 0) { setError('Pick at least one lead.'); return }
    if (sendingDays.size === 0) { setError('Pick at least one sending day.'); return }
    if (capIsZero && !allowUnlimited) { setError('A daily cap of 0 sends everything at once. Set a cap (default 15) or tick “send everything” to confirm.'); return }
    startTransition(async () => {
      const res = await createCampaignAction({
        name,
        subject: subjectA,
        subjectA: subjectA.trim() || undefined,
        subjectB: subjectB.trim() || undefined,
        description: description || undefined,
        fromName: fromName.trim() || undefined,
        fromEmail: fromEmail.trim() || undefined,
        signatureName: signatureName.trim() || undefined,
        signatureBannerUrl: useBanner ? CAROL_BANNER : undefined,
        replyTo: replyTo.trim() || undefined,
        dailySendCap: capIsZero ? 0 : capNum,
        allowUnlimited: capIsZero ? allowUnlimited : undefined,
        leadGroup: leadGroupLabel,
        startDate: startDate || null,
        sendTimeNz,
        sendingDays: Array.from(sendingDays).sort(),
        leadIds: Array.from(selected),
      })
      if (res?.error) setError(res.error)
    })
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-sage-800 mb-4">Campaign</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commercial intro — July 2026"
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Subject A</span>
              <input value={subjectA} onChange={(e) => setSubjectA(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Subject B (A/B test)</span>
              <input value={subjectB} onChange={(e) => setSubjectB(e.target.value)} placeholder="Leave blank to use only Subject A" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm" />
            </label>
          </div>
          <span className="block text-[11px] text-sage-500 mt-1.5">
            {'{company}'} is replaced per lead. If Subject B is set, recipients are split evenly + randomly between A and B, and results are reported per subject.
          </span>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Internal description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — what is this campaign testing?"
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-sage-800 mb-1">Sender</h2>
        <p className="text-[12px] text-sage-500 mb-4">Who the email comes from. Defaults to Carol so it reads as a personal note from her.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">From name</span>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">From email</span>
            <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
            <span className="block text-[11px] text-amber-700 mt-1.5">Must be a verified sender in Resend, or the send will bounce.</span>
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Signature name</span>
            <input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Reply-to</span>
            <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
            <span className="block text-[11px] text-sage-500 mt-1.5">Where replies (including &ldquo;no thanks&rdquo;) land.</span>
          </label>
        </div>
        <label className="flex items-start gap-2.5 mt-4 rounded-lg border border-sage-200 px-3 py-2.5 cursor-pointer">
          <input type="checkbox" checked={useBanner} onChange={(e) => setUseBanner(e.target.checked)} className="mt-0.5" />
          <span className="text-sm">
            <span className="font-medium text-sage-800">Use Carol&rsquo;s image signature banner</span>
            <span className="block text-[12px] text-amber-700">Heads-up: on cold email, image signatures are often blocked on first contact and can raise spam scores. Untick to use a plain-text signature (safer for cold outreach). Always send a test to yourself and check it doesn&rsquo;t land in spam.</span>
          </span>
        </label>

        <div className="mt-4">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Sending pace (warm-up)</span>
          <div className="flex items-center gap-2">
            <input type="number" min="1" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} className="w-24 rounded-lg border border-sage-200 px-3 py-2.5 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
            <span className="text-sm text-sage-600">emails per day</span>
          </div>
          <span className="block text-[12px] text-sage-500 mt-1.5">
            Drips the campaign out (best leads first) to build sender reputation and stay out of spam. 10–15/day is a safe warm-up.
          </span>
          {capOverWarn && (
            <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              ⚠️ {capNum}/day is above 20 — high volume from a fresh sending address risks spam-foldering. Keep it ≤20 unless the domain is well warmed up.
            </p>
          )}
          {capIsZero && (
            <label className="mt-2 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={allowUnlimited} onChange={(e) => setAllowUnlimited(e.target.checked)} className="mt-0.5" />
              <span><strong>Send everything at once (no daily cap).</strong> Not recommended for a cold campaign — it can flatten your sender reputation. Tick to confirm you really want no cap.</span>
            </label>
          )}
        </div>

        {/* Scheduling */}
        <div className="mt-6 space-y-4 border-t border-sage-100 pt-6">
          <h3 className="text-sm font-semibold text-sage-800">Schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Start date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
              <span className="block text-[12px] text-sage-500 mt-1">First sending day (NZ). Leave blank to begin as soon as it’s armed.</span>
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Send time (NZ)</span>
              <input type="time" value={sendTimeNz} onChange={(e) => setSendTimeNz(e.target.value)} className="w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
              <span className="block text-[12px] text-sage-500 mt-1">One daily batch at/after this Auckland time. Default 08:30.</span>
            </label>
          </div>
          <div>
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Sending days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(({ d, label }) => {
                const on = sendingDays.has(d)
                return (
                  <button
                    type="button" key={d}
                    onClick={() => setSendingDays((prev) => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n })}
                    className={clsx('px-3 py-1.5 rounded-md text-sm font-medium border', on ? 'bg-sage-600 text-white border-sage-600' : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300')}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <span className="block text-[12px] text-sage-500 mt-1.5">Default Mon–Thu. Fri/Sat/Sun off — weekends and Fridays get lower engagement.</span>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="text-lg font-semibold text-sage-800">
            Audience
            <span className="text-sage-500 font-normal text-sm ml-2">
              {selected.size} of {leads.length} selected · {counts.A} A / {counts.B} B / {counts.C} C
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)))}
            className="text-xs font-semibold text-sage-600 hover:text-sage-800"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {leads.length === 0 ? (
          <p className="text-sm text-sage-500 bg-sage-50 border border-sage-100 rounded-lg p-4">
            No eligible leads (a lead needs an email address and must not be opted out).
          </p>
        ) : (
          <ul className="border border-sage-100 rounded-xl divide-y divide-sage-100 max-h-[420px] overflow-y-auto bg-white">
            {leads.map((l) => (
              <li key={l.id}>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#fafcfa]">
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                    className="h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                  />
                  <span className={`inline-block text-[10px] font-bold rounded px-1.5 py-0.5 ${QUALITY_RANK_BADGE[l.quality_rank]}`}>
                    {l.quality_rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-sage-800 truncate">{l.company}</span>
                    <span className="block text-xs text-sage-500 truncate">
                      {l.contact_name ? `${l.contact_name}${l.contact_role ? ` (${l.contact_role})` : ''} · ` : ''}
                      {l.email}
                    </span>
                  </span>
                  <span className="text-[11px] text-sage-400 shrink-0">{LEAD_STATUS_LABELS[l.status]}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={clsx(
          'inline-flex items-center gap-2 bg-sage-700 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors',
          isPending ? 'opacity-60 cursor-not-allowed' : 'hover:bg-sage-600'
        )}
      >
        {isPending ? 'Creating…' : 'Create campaign (nothing sends yet)'}
      </button>
      <p className="text-[11px] text-sage-500 -mt-6">
        Creating a campaign only builds the recipient list. You review it, then send from the campaign page.
      </p>
    </form>
  )
}
