import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { NewPayRunForm, type PayrollEmployee } from './_components/NewPayRunForm'

export const dynamic = 'force-dynamic'

export default async function NewPayRunPage() {
  const supabase = createClient()

  // Active EMPLOYEES only (worker_type != contractor) — the people this run pays.
  // Contractors are paid via the separate Contractor pay flow, never here.
  const { data } = await supabase
    .from('contractors')
    .select('id, full_name, pay_frequency, hourly_rate, standard_hours')
    .eq('status', 'active')
    .neq('worker_type', 'contractor')
    .order('full_name')

  const employees: PayrollEmployee[] = (data ?? []).map((e) => ({
    id: e.id as string,
    name: (e.full_name as string) ?? '—',
    payFrequency: (e.pay_frequency as 'weekly' | 'fortnightly' | null) ?? null,
    hourlyRate: e.hourly_rate == null ? null : Number(e.hourly_rate),
    standardHours: e.standard_hours == null ? null : Number(e.standard_hours),
  }))

  return (
    <div>
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-1">New pay run</h1>
      <p className="text-sm text-sage-500 mb-8">Pay your employees. Pick the cycle and see exactly who&rsquo;s included before you create it.</p>
      <NewPayRunForm employees={employees} />
    </div>
  )
}
