// Employees — casual/permanent staff created from signed employment agreements.
// (The staff table is portal-login only; this holds employment/HR details.)

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, position, start_date, status')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Employees</h1>
      <p className="text-sm text-sage-500 mb-6">Employment records, created when a casual employment agreement is signed. Create one via Settings → Employment agreements.</p>

      {(!employees || employees.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-8 text-center text-sm text-sage-500">
          <Users size={24} className="mx-auto text-sage-300 mb-2" /> No employees yet.
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden divide-y divide-sage-50">
          {employees.map((e) => (
            <Link key={e.id} href={`/portal/employees/${e.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-sage-50/60">
              <div>
                <div className="text-sm font-medium text-sage-800">{e.full_name}</div>
                <div className="text-[11px] text-sage-500">{e.position || 'Employee'}{e.start_date ? ` · started ${formatDate(e.start_date)}` : ''}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium capitalize">{e.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
