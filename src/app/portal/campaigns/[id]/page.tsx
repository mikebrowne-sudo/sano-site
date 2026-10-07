import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ArrowLeft, Eye, MousePointerClick, MailCheck, Send as SendIcon } from 'lucide-react'
import { renderCommercialIntro, hasUsableFullName } from '@/lib/campaigns/template'
import { checkSenderReadiness } from '@/lib/campaigns/sender-readiness'
import { QUALITY_RANK_BADGE, type QualityRank } from '@/lib/campaigns/constants'
import { SendCampaignButton, MarkRepliedButton, OptOutButton, TestSendBox, DeleteCampaignButton, FollowupToggle, PauseResumeButton } from '../_components/CampaignActions'
import { NameReviewPanel } from '../_components/NameReviewPanel'
import { PreLaunchSummary } from '../_components/PreLaunchSummary'
import { RecipientPreview } from '../_components/RecipientPreview'
import { EditScheduleCard } from '../_components/EditScheduleCard'
import { SentContactsCard, type SentContact } from '../_components/SentContactsCard'
import { reviewCampaignCompanyNames } from '../_actions'
import { estimateCompletion } from '@/lib/campaigns/send-batch'
import { isAdminUser } from '@/lib/is-admin'

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: campaign }, { data: recipients }, { data: { user } }] = await Promise.all([
    supabase.from('sales_campaigns').select('*').eq('id', params.id).single(),
    supabase
      .from('sales_campaign_recipients')
      .select('id, status, sent_at, opened_at, first_clicked_at, click_count, responded_at, error, subject_variant, bounced_at, followup_sent_at, lead:sales_leads(id, company, contact_name, email, quality_rank)')
      .eq('campaign_id', params.id)
      .order('created_at'),
    supabase.auth.getUser(),
  ])
  const isAdmin = isAdminUser(user)

  if (!campaign) notFound()

  const recs = (recipients ?? []).map((r) => ({
    ...r,
    lead: Array.isArray(r.lead) ? r.lead[0] : r.lead,
  }))

  const pending = recs.filter((r) => r.status === 'pending').length
  const sent = recs.filter((r) => r.status === 'sent').length
  const opened = recs.filter((r) => r.opened_at).length
  const clicked = recs.filter((r) => r.first_clicked_at).length
  const replied = recs.filter((r) => r.responded_at).length
  const pct = (n: number) => (sent > 0 ? `${Math.round((n / sent) * 100)}%` : '—')

  // Sender-readiness (SPF/DKIM/alignment) for the campaign's from-address.
  const readiness = await checkSenderReadiness((campaign.from_email as string | null) || 'noreply@sano.nz')

  // Company-name quality review of pending recipients (pre-launch gate).
  const nameReview = await reviewCampaignCompanyNames(supabase, params.id)
  const followupsEnabled = !!(campaign as { followups_enabled?: boolean }).followups_enabled

  // Scheduling + pre-launch estimate.
  const sendingDays = ((campaign as { sending_days?: number[] | null }).sending_days ?? [1, 2, 3, 4])
  const dailyCap = Number((campaign as { daily_send_cap?: number | null }).daily_send_cap ?? 15)
  const startDate = (campaign as { start_date?: string | null }).start_date ?? null
  const sendTimeNz = (campaign as { send_time_nz?: string | null }).send_time_nz ?? '08:30'
  const leadGroup = (campaign as { lead_group?: string | null }).lead_group ?? null
  const est = estimateCompletion({ recipients: pending, dailyCap, sendingDays, startDate, now: new Date() })
  const fmtNzDate = (ymd: string | null) =>
    ymd ? new Date(`${ymd}T00:00:00+12:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : null

  // Everyone actually emailed, newest first — for the "emails sent" card.
  const sentContacts: SentContact[] = recs
    .filter((r) => r.status === 'sent')
    .sort((a, b) => String(b.sent_at ?? '').localeCompare(String(a.sent_at ?? '')))
    .map((r) => ({
      company: r.lead?.company ?? '—',
      email: r.lead?.email ?? null,
      sentAtDisplay: r.sent_at ? new Date(r.sent_at as string).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null,
      replied: !!r.responded_at,
      bounced: !!(r as { bounced_at?: string | null }).bounced_at,
    }))

  // A/B subject reporting: delivery / reply rate per variant.
  const abStats = ['A', 'B'].map((v) => {
    const inV = recs.filter((r) => (r as { subject_variant?: string | null }).subject_variant === v)
    const sentV = inV.filter((r) => r.status === 'sent').length
    const repliedV = inV.filter((r) => r.responded_at).length
    const bouncedV = inV.filter((r) => (r as { bounced_at?: string | null }).bounced_at).length
    return { v, total: inV.length, sent: sentV, replied: repliedV, bounced: bouncedV, replyPct: sentV > 0 ? Math.round((repliedV / sentV) * 100) : 0 }
  }).filter((s) => s.total > 0)
  const followupsSent = recs.filter((r) => (r as { followup_sent_at?: string | null }).followup_sent_at).length

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
  const senderName = (campaign.signature_name as string | null) || (campaign.from_name as string | null) || 'Carol Browne'
  const senderEmail = (campaign.reply_to as string | null) || (campaign.from_email as string | null) || null
  const bannerUrl = (campaign.signature_banner_url as string | null) || null

  // How the two templates split across THIS campaign's recipients — so you can
  // see exactly how many get "Hi Jane" vs "Hi team" before launching.
  const namedCount = recs.filter((r) => hasUsableFullName(r.lead?.contact_name)).length
  const teamCount = recs.length - namedCount

  // Preview BOTH variants with realistic sample email business names, with
  // {company} interpolated into the subject exactly as a real send would.
  const previewSubject = (sample: string) => ((campaign.subject as string) || 'Cleaning at {company}').replace(/\{company\}/gi, sample)
  const previewNamed = renderCommercialIntro({
    lead: { company: 'Acme Legal', contact_name: 'Jane Smith', email: 'jane.smith@acmelegal.co.nz' },
    token: 'preview', siteUrl, subject: previewSubject('Acme Legal'),
    sender: { name: senderName, email: senderEmail, bannerUrl },
  })
  const previewTeam = renderCommercialIntro({
    lead: { company: 'Northside Accounting', contact_name: null, email: 'info@northside.co.nz' },
    token: 'preview', siteUrl, subject: previewSubject('Northside Accounting'),
    sender: { name: senderName, email: senderEmail, bannerUrl },
  })

  return (
    <div>
      <Link
        href="/portal/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to campaigns
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sage-800 tracking-tight">{campaign.name}</h1>
          <p className="text-sage-500 text-sm mt-1">
            Subject: <span className="text-sage-700">{campaign.subject}</span>
            {campaign.sent_at && (
              <> · sent {new Date(campaign.sent_at).toLocaleString('en-NZ', { dateStyle: 'medium', timeStyle: 'short' })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <SendCampaignButton campaignId={campaign.id} pendingCount={pending} />
          <PauseResumeButton campaignId={campaign.id} status={campaign.status as string} />
          {isAdmin && <DeleteCampaignButton campaignId={campaign.id} redirectTo="/portal/campaigns" variant="full" />}
        </div>
      </div>

      {/* Sender readiness — SPF/DKIM/alignment before launch */}
      {pending > 0 && (
        <div className={`mb-6 rounded-xl border p-4 ${readiness.ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-sm font-semibold ${readiness.ready ? 'text-emerald-800' : 'text-red-800'}`}>
            {readiness.ready ? 'Sender authentication verified' : 'Sender not verified — do not launch yet'}
          </p>
          <ul className="mt-2 space-y-1">
            {readiness.checks.map((c) => (
              <li key={c.label} className="text-[12px] flex items-start gap-1.5">
                <span className={c.ok ? 'text-emerald-600' : 'text-red-600'}>{c.ok ? '✓' : '✕'}</span>
                <span className="text-sage-700"><span className="font-medium">{c.label}:</span> {c.detail}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-sage-500 mt-2">{readiness.note}</p>
        </div>
      )}

      {/* Pre-launch plain-English summary */}
      {pending > 0 && (
        <PreLaunchSummary
          name={campaign.name as string}
          recipients={pending}
          leadGroup={leadGroup}
          startDateDisplay={fmtNzDate(startDate) ?? 'as soon as armed'}
          sendTimeNz={sendTimeNz}
          sendingDays={sendingDays}
          dailyCap={dailyCap}
          followupsEnabled={followupsEnabled}
          sendingDaysNeeded={est.sendingDaysNeeded}
          completionDisplay={fmtNzDate(est.completionYmd)}
        />
      )}

      {/* Company-name quality review — blocks launch on unsafe interpolation */}
      {pending > 0 && (
        <NameReviewPanel campaignId={campaign.id} flagged={nameReview.flagged} blocking={nameReview.blocking} />
      )}

      {/* Test send — verify deliverability + look before the real send */}
      {pending > 0 && (
        <div className="mb-8 max-w-md">
          <TestSendBox campaignId={campaign.id} />
        </div>
      )}

      {/* Automatic follow-up toggle (defaults OFF) */}
      <div className="mb-8 max-w-md">
        <FollowupToggle campaignId={campaign.id} enabled={followupsEnabled} />
      </div>

      {/* Edit schedule (name / start / time / days / cap). Recipient list stays locked. */}
      <EditScheduleCard
        campaignId={campaign.id}
        status={campaign.status as string}
        initial={{ name: campaign.name as string, startDate: startDate, sendTimeNz, sendingDays, dailyCap }}
      />

      {/* Emails sent — click to see everyone emailed */}
      <SentContactsCard contacts={sentContacts} />

      {/* A/B subject results */}
      {abStats.length > 1 && (
        <div className="mb-8 bg-white border border-sage-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-3">Subject A/B results</h2>
          <div className="grid grid-cols-2 gap-4">
            {abStats.map((s) => (
              <div key={s.v} className="rounded-lg border border-sage-100 p-3">
                <p className="text-xs font-semibold text-sage-700 mb-1">Subject {s.v}</p>
                <p className="text-sm text-sage-600 tabular-nums">{s.sent} sent · {s.replied} replied ({s.replyPct}%){s.bounced ? ` · ${s.bounced} bounced` : ''}</p>
              </div>
            ))}
          </div>
          {followupsSent > 0 && <p className="text-[11px] text-sage-400 mt-2">{followupsSent} follow-up{followupsSent === 1 ? '' : 's'} sent.</p>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Stat icon={<SendIcon size={15} />} label="Sent" value={`${sent}/${recs.length}`} />
        <Stat icon={<Eye size={15} />} label="Opened" value={`${opened} (${pct(opened)})`} />
        <Stat icon={<MousePointerClick size={15} />} label="Clicked" value={`${clicked} (${pct(clicked)})`} />
        <Stat icon={<MailCheck size={15} />} label="Replied" value={`${replied} (${pct(replied)})`} highlight={replied > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
        {/* Recipients */}
        <section className="bg-white border border-sage-100 rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide px-5 pt-5 pb-3">
            Recipients
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-sage-400 border-b border-sage-100">
                <th className="px-5 py-2 font-semibold">Lead</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Engagement</th>
                <th className="px-5 py-2 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage-50">
              {recs.map((r) => (
                <tr key={r.id} className="hover:bg-[#fafcfa]">
                  <td className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      {r.lead && (
                        <span className={`inline-block text-[10px] font-bold rounded px-1.5 py-0.5 mt-0.5 ${QUALITY_RANK_BADGE[(r.lead.quality_rank ?? 'C') as QualityRank]}`}>
                          {r.lead.quality_rank}
                        </span>
                      )}
                      <RecipientPreview recipientId={r.id} company={r.lead?.company ?? '—'} email={r.lead?.email ?? null} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={
                      r.status === 'sent' ? 'text-green-700 text-xs font-semibold'
                      : r.status === 'failed' ? 'text-red-600 text-xs font-semibold'
                      : r.status === 'skipped' ? 'text-sage-400 text-xs'
                      : 'text-sage-500 text-xs'
                    }>
                      {r.status}
                    </span>
                    {r.error && <p className="text-[10px] text-red-500 mt-0.5 max-w-[140px] truncate" title={r.error}>{r.error}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 text-[11px]">
                      {r.opened_at && <span className="text-blue-600 font-medium">opened</span>}
                      {r.first_clicked_at && <span className="text-purple-600 font-medium">clicked{r.click_count > 1 ? ` ×${r.click_count}` : ''}</span>}
                      {r.responded_at && <span className="text-green-700 font-semibold">replied</span>}
                      {!r.opened_at && !r.first_clicked_at && !r.responded_at && <span className="text-sage-300">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === 'sent' && !r.responded_at && (
                      <span className="inline-flex items-center gap-3">
                        <MarkRepliedButton recipientId={r.id} />
                        <OptOutButton recipientId={r.id} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {recs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sage-400 text-sm">No recipients.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Email preview — both templates + the split across recipients */}
        <section className="bg-white border border-sage-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-1">Email preview</h2>
          <p className="text-[11px] text-sage-400 mb-3">
            Two versions are sent automatically depending on whether we have a reliable name. Each recipient gets their own name + company.
          </p>
          <div className="flex gap-2 flex-wrap mb-4 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 border border-sage-200 px-3 py-1 font-medium text-sage-700">{namedCount} named &rarr; &ldquo;Hi [name]&rdquo;</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-50 border border-sage-200 px-3 py-1 font-medium text-sage-700">{teamCount} team &rarr; &ldquo;Hi team&rdquo;</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-xs text-sage-500 mb-2"><span className="font-semibold text-sage-700">Named</span> &middot; subject: {previewNamed.subject}</p>
              <div className="border border-sage-100 rounded-lg p-1 bg-[#fafcfa] [&_p]:!text-[13px]" dangerouslySetInnerHTML={{ __html: previewNamed.html }} />
            </div>
            <div>
              <p className="text-xs text-sage-500 mb-2"><span className="font-semibold text-sage-700">Team</span> (no reliable name) &middot; subject: {previewTeam.subject}</p>
              <div className="border border-sage-100 rounded-lg p-1 bg-[#fafcfa] [&_p]:!text-[13px]" dangerouslySetInnerHTML={{ __html: previewTeam.html }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-green-200 bg-green-50' : 'border-sage-100 bg-white'}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sage-500">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${highlight ? 'text-green-700' : 'text-sage-800'}`}>{value}</p>
    </div>
  )
}
