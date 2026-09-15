// Per-client pay rates for one worker (Phase: contractor client rates).
//
// Same route shape as the existing /tax, /gst, /pay and /setup sub-pages, so
// this adds no new navigation concept.
//
// Why this page exists: job assignment used to stamp the worker's flat profile
// rate on every job, so ongoing work at a negotiated rate (Upasni at Oranga
// Tamariki, $32.20) had to be corrected by hand on every job before each pay
// run. A rate set here is applied automatically to future jobs at that client.
//
// Changing a rate SUPERSEDES rather than overwrites, and never reprices a job
// that is already assigned.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isFinanceUser } from '@/lib/is-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { BackLink } from '../../../_components/BackLink'
import { ClientRateForm } from './_components/ClientRateForm'

export const dynamic = 'force-dynamic'

/** The embedded `clients` relation types as an array; read the single row off it. */
function clientName(rel: unknown): string {
  const row = Array.isArray(rel) ? rel[0] : rel
  return (row as { name?: string } | null)?.name ?? '—'
}

export default async function WorkerRatesPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const { data: worker } = await supabase
    .from('contractors')
    .select('id, full_name, hourly_rate')
    .eq('id', params.id)
    .maybeSingle()
  if (!worker) notFound()

  const name = (worker.full_name as string | null) ?? 'Worker'
  const profileRate = (worker.hourly_rate as number | null) ?? null

  const [{ data: rates }, { data: clients }] = await Promise.all([
    supabase
      .from('contractor_client_rates')
      .select('id, client_id, hourly_rate, effective_from, effective_to, note, status, clients ( name )')
      .eq('contractor_id', params.id)
      .order('status', { ascending: true })
      .order('effective_from', { ascending: false }),
    supabase.from('clients').select('id, name').order('name'),
  ])

  const current = (rates ?? []).filter((r) => r.status === 'active' && !r.effective_to)
  const past = (rates ?? []).filter((r) => r.status !== 'active' || r.effective_to)

  return (
    <div className="max-w-4xl mx-auto">
      <BackLink fallbackHref={`/portal/contractors/${params.id}`} label={`Back to ${name}`} />
      <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-1">{name} · Rates</h1>
      <p className="text-sm text-sage-500 mb-6">
        Set the rate for ongoing work at a client once. Every new job at that client uses it
        automatically — no need to fix the rate job by job before a pay run.
      </p>

      <section className="bg-white border border-sage-200 rounded-lg p-5 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-1">Profile default</h2>
        <p className="text-sm text-sage-600">
          {profileRate != null ? (
            <>
              <span className="font-semibold text-sage-800">{formatCurrency(profileRate)}/hr</span>
              {' '}— used for any client without a rate set below.
            </>
          ) : (
            'No profile rate set. Jobs at a client without a rate below will have no rate.'
          )}
        </p>
      </section>

      <section className="bg-white border border-sage-200 rounded-lg p-5 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-3">Current client rates</h2>
        {current.length === 0 ? (
          <p className="text-sm text-sage-500">
            No client rates set. Every job uses the profile default above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sage-500 border-b border-sage-200">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Rate</th>
                <th className="pb-2 font-medium">From</th>
                <th className="pb-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {current.map((r) => (
                <tr key={r.id as string} className="border-b border-sage-100 last:border-0">
                  <td className="py-2.5 text-sage-800">
                    {clientName(r.clients)}
                  </td>
                  <td className="py-2.5 font-semibold text-sage-800">
                    {formatCurrency(Number(r.hourly_rate))}/hr
                  </td>
                  <td className="py-2.5 text-sage-600">{formatDate(r.effective_from as string)}</td>
                  <td className="py-2.5 text-sage-500">{(r.note as string | null) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ClientRateForm
        contractorId={params.id}
        clients={(clients ?? []).map((c) => ({ id: c.id as string, name: c.name as string }))}
      />

      {past.length > 0 && (
        <section className="bg-white border border-sage-200 rounded-lg p-5 mt-6">
          <h2 className="text-base font-semibold text-sage-800 mb-1">Past rates</h2>
          <p className="text-xs text-sage-500 mb-3">
            Kept so historical pay stays explainable. Jobs already assigned keep the rate they were
            assigned at.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sage-500 border-b border-sage-200">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Rate</th>
                <th className="pb-2 font-medium">Period</th>
              </tr>
            </thead>
            <tbody>
              {past.map((r) => (
                <tr key={r.id as string} className="border-b border-sage-100 last:border-0">
                  <td className="py-2.5 text-sage-700">
                    {clientName(r.clients)}
                  </td>
                  <td className="py-2.5 text-sage-700">
                    {formatCurrency(Number(r.hourly_rate))}/hr
                  </td>
                  <td className="py-2.5 text-sage-500">
                    {formatDate(r.effective_from as string)}
                    {r.effective_to ? ` – ${formatDate(r.effective_to as string)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-xs text-sage-500 mt-6">
        Need to change what one job pays?{' '}
        <Link href={`/portal/contractors/${params.id}/pay`} className="underline">
          Edit the rate on that job
        </Link>
        {' '}— a rate set here applies to new jobs only.
      </p>
    </div>
  )
}
