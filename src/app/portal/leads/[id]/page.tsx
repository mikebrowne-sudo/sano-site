import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import {
  ArrowLeft, Pencil, Globe, Link2, Mail, Phone, MapPin,
  StickyNote, PhoneCall, AtSign, CalendarClock, ArrowRightLeft,
} from 'lucide-react'
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_BADGE,
  QUALITY_RANK_BADGE,
  QUALITY_RANK_LABELS,
  type SalesLead,
} from '@/lib/campaigns/constants'
import { AddNoteForm } from '../_components/LeadControls'
import { LeadQuickLog } from '../_components/LeadQuickLog'

const KIND_ICON = {
  note: StickyNote,
  call: PhoneCall,
  email: AtSign,
  follow_up: CalendarClock,
  status_change: ArrowRightLeft,
} as const

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: lead }, { data: activities }, { data: sends }] = await Promise.all([
    supabase.from('sales_leads').select('*').eq('id', params.id).single(),
    supabase
      .from('sales_lead_activities')
      .select('id, kind, body, created_at')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('sales_campaign_recipients')
      .select('id, status, sent_at, opened_at, first_clicked_at, responded_at, campaign:sales_campaigns(id, name)')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!lead) notFound()
  const l = lead as SalesLead

  return (
    <div>
      <Link
        href="/portal/leads"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to leads
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-sage-800 tracking-tight">{l.company}</h1>
            <span className={`inline-block text-[11px] font-bold rounded px-2 py-0.5 ${QUALITY_RANK_BADGE[l.quality_rank]}`}>
              Rank {l.quality_rank}
            </span>
            <span className={`inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${LEAD_STATUS_BADGE[l.status]}`}>
              {LEAD_STATUS_LABELS[l.status]}
            </span>
          </div>
          <p className="text-sage-500 text-sm mt-1">
            {l.industry ? l.industry.charAt(0).toUpperCase() + l.industry.slice(1) : 'Lead'}
            {l.staff_size ? ` · ${l.staff_size} staff` : ''}
            {l.source ? ` · via ${l.source}` : ''}
          </p>
        </div>
        <Link
          href={`/portal/leads/${l.id}/edit`}
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
        >
          <Pencil size={14} />
          Edit lead
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
        <div className="space-y-8">
          {/* Contact card */}
          <section className="bg-white border border-sage-100 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-4">Contact</h2>
            <div className="space-y-2.5 text-sm">
              <p className="text-sage-800 font-medium">
                {l.contact_name || 'No named contact yet'}
                {l.contact_role && <span className="text-sage-500 font-normal"> · {l.contact_role}</span>}
              </p>
              {l.email && (
                <p className="flex items-center gap-2 text-sage-600">
                  <Mail size={14} className="text-sage-400" />
                  <a href={`mailto:${l.email}`} className="hover:text-sage-800">{l.email}</a>
                </p>
              )}
              {l.phone && (
                <p className="flex items-center gap-2 text-sage-600">
                  <Phone size={14} className="text-sage-400" />
                  <a href={`tel:${l.phone}`} className="hover:text-sage-800">{l.phone}</a>
                </p>
              )}
              {l.website && (
                <p className="flex items-center gap-2 text-sage-600">
                  <Globe size={14} className="text-sage-400" />
                  <a href={l.website} target="_blank" rel="noreferrer" className="hover:text-sage-800">{l.website}</a>
                </p>
              )}
              {l.linkedin_url && (
                <p className="flex items-center gap-2 text-sage-600">
                  <Link2 size={14} className="text-sage-400" />
                  <a href={l.linkedin_url} target="_blank" rel="noreferrer" className="hover:text-sage-800">LinkedIn</a>
                </p>
              )}
              {l.address && (
                <p className="flex items-center gap-2 text-sage-600">
                  <MapPin size={14} className="text-sage-400" />
                  {l.address}
                </p>
              )}
            </div>
            <p className="text-[11px] text-sage-400 mt-4">{QUALITY_RANK_LABELS[l.quality_rank]}</p>
            {l.notes && (
              <div className="mt-4 pt-4 border-t border-sage-100">
                <h3 className="text-xs font-semibold text-sage-500 uppercase tracking-wide mb-1.5">Research notes</h3>
                <p className="text-sm text-sage-600 whitespace-pre-wrap">{l.notes}</p>
              </div>
            )}
          </section>

          {/* Campaign history */}
          <section className="bg-white border border-sage-100 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-4">Campaign history</h2>
            {(sends ?? []).length === 0 ? (
              <p className="text-sm text-sage-500">Not included in any campaign yet.</p>
            ) : (
              <ul className="space-y-3">
                {(sends ?? []).map((s) => {
                  const campaign = Array.isArray(s.campaign) ? s.campaign[0] : s.campaign
                  return (
                    <li key={s.id} className="text-sm flex items-center justify-between gap-3 flex-wrap">
                      <Link href={`/portal/campaigns/${campaign?.id}`} className="font-medium text-sage-800 hover:underline">
                        {campaign?.name ?? 'Campaign'}
                      </Link>
                      <span className="flex items-center gap-2 text-xs text-sage-500">
                        <span>{s.status}</span>
                        {s.opened_at && <span className="text-blue-600 font-medium">opened</span>}
                        {s.first_clicked_at && <span className="text-purple-600 font-medium">clicked</span>}
                        {s.responded_at && <span className="text-green-600 font-medium">replied</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* One-box log: note + status + follow-up + renewal, saved together */}
          <LeadQuickLog
            leadId={l.id}
            currentStatus={l.status}
            currentFollowUp={l.next_follow_up}
            currentRenewal={(l as { renewal_date?: string | null }).renewal_date ?? null}
          />

          {/* Timeline */}
          <section className="bg-white border border-sage-100 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-4">Activity</h2>
            <AddNoteForm leadId={l.id} />
            <ul className="mt-6 space-y-4">
              {(activities ?? []).map((a) => {
                const Icon = KIND_ICON[a.kind as keyof typeof KIND_ICON] ?? StickyNote
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-50">
                      <Icon size={13} className="text-sage-500" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-sage-700 whitespace-pre-wrap">{a.body}</p>
                      <p className="text-[11px] text-sage-400 mt-0.5">
                        {new Date(a.created_at).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </li>
                )
              })}
              {(activities ?? []).length === 0 && (
                <li className="text-sm text-sage-400">No activity yet.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
