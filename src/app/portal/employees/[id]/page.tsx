import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: e } = await supabase.from('employees').select('*').eq('id', params.id).maybeSingle()
  if (!e) notFound()

  const rows: [string, string][] = [
    ['Preferred name', e.preferred_name || '—'],
    ['Phone', e.phone || '—'],
    ['Email', e.email || '—'],
    ['Address', e.address || '—'],
    ['Date of birth', e.date_of_birth ? formatDate(e.date_of_birth) : '—'],
    ['Start date', e.start_date ? formatDate(e.start_date) : '—'],
    ['Position', e.position || '—'],
    ['Hourly rate', e.hourly_rate != null ? `$${Number(e.hourly_rate).toFixed(2)}` : '—'],
    ['IRD number', e.ird_number || '—'],
    ['Tax code', e.tax_code || '—'],
    ['KiwiSaver', e.kiwisaver_opt_out ? 'Opted out' : 'In'],
    ['Bank account name', e.bank_account_name || '—'],
    ['Bank account', e.bank_account_number || '—'],
    ['Emergency contact', [e.emergency_contact_name, e.emergency_contact_phone, e.emergency_contact_relationship].filter(Boolean).join(' · ') || '—'],
  ]

  return (
    <div className="max-w-2xl">
      <Link href="/portal/employees" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Employees
      </Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-1">{e.full_name}</h1>
      <p className="text-sm text-sage-500 mb-5 capitalize">{e.status}</p>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={i} className="border-b border-sage-50 last:border-0">
                <td className="py-2.5 px-4 text-sage-500 w-1/3 align-top">{k}</td>
                <td className="py-2.5 px-4 font-medium text-sage-800">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {e.agreement_id && (
        <Link href={`/portal/agreements/${e.agreement_id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mt-4">
          <FileSignature size={14} /> View signed agreement
        </Link>
      )}
    </div>
  )
}
