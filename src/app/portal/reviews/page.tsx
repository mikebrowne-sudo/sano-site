// Reviews — recently-completed cleans so staff can ask happy clients for a Google
// review while it's fresh. Reuses the per-job RequestReviewButton (editable
// message, SMS/email, recent/previous). Shows who's already been asked (per
// customer) so we don't double-up.

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { Star, Phone, Mail, Check, User } from 'lucide-react'
import { RequestReviewButton } from '../jobs/[id]/_components/RequestReviewButton'
import { GoogleReviewsPanel } from './_components/GoogleReviewsPanel'
import { REVIEW_REASK_MONTHS } from '@/lib/review-request'
import { preferContact, type ContactRow } from '@/lib/review-recipient'

export const dynamic = 'force-dynamic'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

interface JobRow {
  id: string
  job_number: string | null
  address: string | null
  scheduled_date: string | null
  client_id: string | null
  contact_id: string | null
  clients: { name: string | null; phone: string | null; email: string | null } | null
}

export default async function ReviewsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('jobs')
    .select('id, job_number, address, scheduled_date, client_id, contact_id, clients ( name, phone, email )')
    .in('status', ['completed', 'invoiced'])
    .gte('scheduled_date', since)
    .order('scheduled_date', { ascending: false })
    .limit(60)

  const rows = (data ?? []) as unknown as JobRow[]

  // Resolve each job's greeting name: the job's main contact, else the client's
  // primary contact, else the client (business) name. Batched to two queries.
  const contactIds = Array.from(new Set(rows.map((r) => r.contact_id).filter(Boolean))) as string[]
  const contactById = new Map<string, ContactRow>()
  if (contactIds.length) {
    const { data: cs } = await supabase
      .from('contacts')
      .select('id, full_name, email, phone')
      .in('id', contactIds)
    for (const c of (cs ?? []) as (ContactRow & { id: string })[]) contactById.set(c.id, c)
  }
  const clientsNeedingPrimary = Array.from(
    new Set(rows.filter((r) => !r.contact_id && r.client_id).map((r) => r.client_id)),
  ) as string[]
  const primaryByClient = new Map<string, ContactRow>()
  if (clientsNeedingPrimary.length) {
    const { data: cs } = await supabase
      .from('contacts')
      .select('client_id, full_name, email, phone')
      .in('client_id', clientsNeedingPrimary)
      .eq('contact_type', 'primary')
    for (const c of (cs ?? []) as (ContactRow & { client_id: string })[]) {
      if (!primaryByClient.has(c.client_id)) primaryByClient.set(c.client_id, c)
    }
  }

  // Last review request per customer (for the "already asked" dedupe display).
  const clientIds = Array.from(new Set(rows.map((r) => r.client_id).filter(Boolean))) as string[]
  const lastAsked = new Map<string, string>()
  if (clientIds.length) {
    const { data: reqs } = await supabase
      .from('review_requests')
      .select('client_id, sent_at')
      .in('client_id', clientIds)
      .order('sent_at', { ascending: false })
    for (const r of (reqs ?? []) as { client_id: string; sent_at: string }[]) {
      if (!lastAsked.has(r.client_id)) lastAsked.set(r.client_id, r.sent_at)
    }
  }
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - REVIEW_REASK_MONTHS)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <Star size={20} className="text-amber-500" />
        <h1 className="text-2xl font-bold text-sage-800">Reviews</h1>
      </div>
      <p className="text-sm text-sage-500 mb-6">
        Recently completed cleans — ask your happy clients for a Google review while it&rsquo;s fresh
        (best same-day or next morning). Only ask the ones you know went well; already-asked customers are flagged.
      </p>

      <Suspense fallback={<div className="mb-6 h-20 rounded-2xl border border-sage-100 bg-sage-50/50 animate-pulse" />}>
        <GoogleReviewsPanel />
      </Suspense>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-10 text-center text-sm text-sage-500">
          No completed cleans in the last 30 days.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((j) => {
            const c = j.clients
            const contact = j.contact_id
              ? contactById.get(j.contact_id)
              : j.client_id
                ? primaryByClient.get(j.client_id)
                : undefined
            // Who the request greets + goes to (main contact → primary → client).
            const recipient = preferContact(contact ?? null, c)
            const last = j.client_id ? lastAsked.get(j.client_id) : undefined
            const recentlyAsked = last ? new Date(last) > cutoff : false
            const contactIsDistinct = recipient.name && recipient.name !== c?.name
            return (
              <div key={j.id} className="bg-white rounded-xl border border-sage-100 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  {/* Customer · JOB-#### · Address */}
                  <div className="text-sm font-medium text-sage-800">
                    {c?.name ?? 'Client'}
                    {j.job_number && <span className="text-sage-500 font-normal"> · {j.job_number}</span>}
                    {j.address && <span className="text-sage-400 text-xs font-normal"> · {j.address}</span>}
                  </div>
                  <div className="text-[11px] text-sage-500 flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span>{fmtDate(j.scheduled_date)}</span>
                    {contactIsDistinct && (
                      <span className="inline-flex items-center gap-1 text-sage-600"><User size={11} /> {recipient.name}</span>
                    )}
                    {recipient.email
                      ? <span className="inline-flex items-center gap-1"><Mail size={11} /> {recipient.email}</span>
                      : <span className="inline-flex items-center gap-1 text-amber-600"><Mail size={11} /> no email on file</span>}
                    {recipient.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {recipient.phone}</span>}
                    {recentlyAsked && <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><Check size={11} /> asked {fmtDate(last!)}</span>}
                  </div>
                </div>
                <RequestReviewButton jobId={j.id} clientName={recipient.name} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
