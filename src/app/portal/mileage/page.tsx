// Mileage logbook — home base → stops → home base, actual driving km.
// For tax compliance (IRD logbook / reimbursement). Admins log + delete;
// finance/accountant users can view (read-only) for visibility.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Route } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isFinanceUser, isAdminUser } from '@/lib/is-admin'
import { summariseMileage, HOME_BASE, MILEAGE_RATE_PER_KM, type MileageStop } from '@/lib/mileage'
import { MileageLogForm } from './_components/MileageLogForm'
import { DeleteMileageButton } from './_components/DeleteMileageButton'
import { formatCurrency, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MileagePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()
  const canEdit = isAdminUser(user)

  const { data: rows } = await supabase
    .from('mileage_logs')
    .select('id, log_date, person_label, stops, distance_km, notes')
    .order('log_date', { ascending: false })

  const logs = (rows ?? []).map((r) => ({
    id: r.id as string,
    logDate: r.log_date as string,
    personLabel: (r.person_label as string | null) ?? null,
    stops: (r.stops as MileageStop[] | null) ?? [],
    distanceKm: Number(r.distance_km) || 0,
    notes: (r.notes as string | null) ?? null,
  }))
  const totals = summariseMileage(logs)

  return (
    <div className="max-w-4xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Finance
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Mileage logbook</h1>
      <p className="text-sm text-sage-500 mb-6 max-w-2xl">
        Work driving from home base ({HOME_BASE}). Add each day’s stops and it calculates the actual driving kilometres for tax records and reimbursement.
      </p>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 tnum">
        <Stat label="Total km logged" value={`${totals.totalKm} km`} />
        <Stat label="Days logged" value={String(totals.logCount)} />
        <Stat
          label="Est. reimbursement"
          value={`≈ ${formatCurrency(totals.estimatedReimbursement)}`}
          hint={`at $${MILEAGE_RATE_PER_KM}/km — confirm IRD rate`}
        />
      </div>

      {canEdit && (
        <div className="mb-8">
          <MileageLogForm />
        </div>
      )}

      {/* Logs */}
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sage-500 mb-2 px-1">Logged days</h2>
      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-10 text-center">
          <Route size={26} className="text-sage-300 mx-auto mb-2" />
          <p className="text-sm text-sage-600 font-medium">No mileage logged yet</p>
          {canEdit && <p className="text-xs text-sage-400 mt-1">Log a day above to start the record.</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-gray-50">
          {logs.map((l) => (
            <div key={l.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-sage-800">{formatDate(l.logDate)}</span>
                  {l.personLabel && <span className="text-[11px] text-sage-400">· {l.personLabel}</span>}
                </div>
                <div className="text-xs text-sage-500 mt-1 flex items-start gap-1.5">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-sage-400" />
                  <span className="leading-snug">{l.stops.map((s) => s.address).join(' → ') || '—'}</span>
                </div>
                {l.notes && <p className="text-[11px] text-sage-400 mt-1 italic">{l.notes}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-bold text-sage-800 tabular-nums">{l.distanceKm} km</span>
                {canEdit && <DeleteMileageButton id={l.id} />}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-sage-400 mt-6 max-w-2xl">
        The dollar figure is an estimate only — actual reimbursement is applied at payroll using the IRD kilometre rate your accountant confirms. Distances are the driving route between the addresses (via Mapbox).
      </p>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className="text-xl font-bold text-sage-800 mt-1">{value}</p>
      {hint && <p className="text-[10px] text-sage-400 mt-0.5">{hint}</p>}
    </div>
  )
}
