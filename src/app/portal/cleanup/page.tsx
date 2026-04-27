// Phase 5.5.10 — Cleanup dashboard.
//
// Surfaces the three classes of data issues we know about:
//   · Duplicate clients (matching email or normalised phone).
//   · Invoices with no linked job (`invoice.job_id IS NULL`).
//   · Jobs flagged as 'manual' (quote_id IS NULL — not necessarily a
//     bug, just informational).
//   · Job ↔ quote client mismatches.
//
// Each row links into its source record where the admin fixes it in
// context. Admin-only — non-admin staff get a one-line message.

import Link from 'next/link'
import { ArrowLeft, AlertTriangle, FileText, Briefcase, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'michael@sano.nz'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface DupGroup {
  key: string
  matched_on: 'email' | 'phone'
  value: string
  clients: { id: string; name: string; company_name: string | null; email: string | null; phone: string | null }[]
}

export default async function CleanupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === ADMIN_EMAIL

  if (!isAdmin) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-sage-800 mb-2">Cleanup</h1>
        <p className="text-sm text-sage-600 bg-sage-50 border border-sage-100 rounded-xl px-4 py-3">
          Cleanup tools are admin-only.
        </p>
      </div>
    )
  }

  const [{ data: clients }, { data: invoices }, { data: jobs }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company_name, email, phone, is_archived')
      .eq('is_archived', false)
      .order('name'),
    supabase
      .from('invoices')
      .select('id, invoice_number, client_id, job_id, status, date_issued, source, clients ( id, name )')
      .is('deleted_at', null)
      .is('job_id', null)
      .order('date_issued', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, job_number, client_id, quote_id, status, scheduled_date, source, quotes ( id, client_id, quote_number )')
      .is('deleted_at', null)
      .order('scheduled_date', { ascending: false, nullsFirst: false }),
  ])

  // ── Duplicate detection (email exact, phone normalised) ─────────
  const byEmail = new Map<string, DupGroup>()
  const byPhone = new Map<string, DupGroup>()
  for (const c of (clients ?? []) as DupGroup['clients']) {
    if (c.email && c.email.trim()) {
      const k = c.email.trim().toLowerCase()
      if (!byEmail.has(k)) byEmail.set(k, { key: 'e:' + k, matched_on: 'email', value: c.email.trim(), clients: [] })
      byEmail.get(k)!.clients.push(c)
    }
    const digits = (c.phone ?? '').replace(/\D+/g, '')
    if (digits.length >= 6) {
      if (!byPhone.has(digits)) byPhone.set(digits, { key: 'p:' + digits, matched_on: 'phone', value: c.phone ?? digits, clients: [] })
      byPhone.get(digits)!.clients.push(c)
    }
  }
  const duplicates: DupGroup[] = [
    ...Array.from(byEmail.values()),
    ...Array.from(byPhone.values()),
  ].filter((g) => g.clients.length > 1)

  // ── Manual jobs + client-mismatch jobs ──────────────────────────
  type JobRow = { id: string; job_number: string; client_id: string; quote_id: string | null; status: string; scheduled_date: string | null; source: string | null; quotes: { id: string; client_id: string; quote_number: string } | null }
  const manualJobs: JobRow[] = []
  const mismatchJobs: JobRow[] = []
  for (const j of ((jobs ?? []) as unknown as JobRow[])) {
    if (j.quote_id && j.quotes && j.quotes.client_id !== j.client_id) {
      mismatchJobs.push(j)
    } else if (!j.quote_id) {
      manualJobs.push(j)
    }
  }

  type InvoiceRow = { id: string; invoice_number: string; client_id: string; job_id: string | null; status: string; date_issued: string | null; source: string | null; clients: { id: string; name: string } | null }
  const unlinkedInvoices = ((invoices ?? []) as unknown as InvoiceRow[])

  return (
    <div>
      <Link href="/portal/settings" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} />
        Back to settings
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Cleanup</h1>
        <p className="text-sm text-sage-500 mt-0.5">Possible duplicates, broken links, and manual records that may need attention.</p>
      </header>

      <Section
        title="Duplicate clients"
        icon={<Users size={16} className="text-amber-500" />}
        count={duplicates.length}
        empty="No duplicate clients detected."
      >
        <ul className="divide-y divide-sage-50">
          {duplicates.map((g) => (
            <li key={g.key} className="py-3">
              <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold mb-1.5">
                Same {g.matched_on} · <span className="font-mono text-[11px] normal-case">{g.value}</span>
              </p>
              <ul className="space-y-1">
                {g.clients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/portal/clients/${c.id}`} className="text-sm text-sage-800 hover:underline">
                      {c.name}{c.company_name && <span className="text-sage-500"> · {c.company_name}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Job ↔ quote client mismatches"
        icon={<AlertTriangle size={16} className="text-red-500" />}
        count={mismatchJobs.length}
        empty="No mismatched jobs."
      >
        <ul className="divide-y divide-sage-50">
          {mismatchJobs.map((j) => {
            const job = j as unknown as { id: string; job_number: string; quote_id: string | null; quotes: { quote_number: string } | null }
            return (
              <li key={job.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/portal/jobs/${job.id}`} className="text-sage-800 font-medium hover:underline">{job.job_number}</Link>
                  <p className="text-xs text-sage-500 mt-0.5">
                    Linked quote {job.quotes?.quote_number ?? '—'} belongs to a different client.
                  </p>
                </div>
                <Link href={`/portal/jobs/${job.id}`} className="shrink-0 text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-lg">Open job</Link>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section
        title="Invoices with no linked job"
        icon={<FileText size={16} className="text-amber-500" />}
        count={unlinkedInvoices.length}
        empty="Every invoice is linked to a job."
        hint="Either cash-sale invoices that intentionally skip the job stage, or older imports. Open each to link or mark manual."
      >
        <ul className="divide-y divide-sage-50">
          {unlinkedInvoices.map((inv) => (
            <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/portal/invoices/${inv.id}`} className="text-sage-800 font-medium hover:underline">{inv.invoice_number}</Link>
                <p className="text-xs text-sage-500 mt-0.5">
                  {inv.clients?.name ?? 'Unknown client'} · {inv.status} · issued {fmtDate(inv.date_issued)}
                </p>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">{inv.source ?? 'unset'}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Manual jobs (no quote link)"
        icon={<Briefcase size={16} className="text-sage-500" />}
        count={manualJobs.length}
        empty="Every job ties back to a quote."
        hint="Informational — manual jobs are allowed; this just lists them so you can decide if any should have a quote attached."
      >
        <ul className="divide-y divide-sage-50">
          {manualJobs.map((j) => (
            <li key={j.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/portal/jobs/${j.id}`} className="text-sage-800 font-medium hover:underline">{j.job_number}</Link>
                <p className="text-xs text-sage-500 mt-0.5">
                  {j.status} · scheduled {fmtDate(j.scheduled_date)}
                </p>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-2 py-0.5">{j.source ?? 'manual'}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function Section({
  title,
  icon,
  count,
  empty,
  hint,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  empty: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-sage-100 shadow-sm p-5 mb-4">
      <header className="flex items-center justify-between gap-3 mb-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-sage-800">
          {icon}{title}
        </h2>
        <span className="text-xs font-semibold text-sage-500">{count}</span>
      </header>
      {hint && <p className="text-xs text-sage-500 mb-2">{hint}</p>}
      {count === 0 ? (
        <p className="text-sm text-sage-500 mt-2">{empty}</p>
      ) : (
        children
      )}
    </section>
  )
}
