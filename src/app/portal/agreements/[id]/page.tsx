import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Link2, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'
import { CopyLinkButton } from './_components/CopyLinkButton'
import { SendLinkForm } from './_components/SendLinkForm'

export const dynamic = 'force-dynamic'

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: a } = await supabase.from('employment_agreements').select('*').eq('id', params.id).maybeSingle()
  if (!a) notFound()

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const link = `${origin}/agreement/${a.token}`
  const signed = a.status === 'signed'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <Link href="/portal/agreements" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800">
          <ArrowLeft size={14} /> Employment agreements
        </Link>
        <a
          href={`/api/agreements/${a.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-3.5 py-2 rounded-lg text-sm hover:bg-sage-50"
        >
          <Download size={15} /> Download PDF
        </a>
      </div>

      {a.is_test && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-sm text-amber-800">
          <span className="font-semibold uppercase tracking-wide text-[11px] mr-2">Test run</span>
          Signing this won&apos;t create a contractor/employee record, and only you are emailed — safe to dry-run.
        </div>
      )}

      {!signed && (
        <div className="rounded-xl border border-sage-200 bg-white p-5 mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-sage-800 mb-2"><Link2 size={15} className="text-sage-500" /> Send this link to {a.person_label || 'the employee'}</p>
          <CopyLinkButton url={link} />
          <p className="text-[11px] text-sage-400 mt-2">They open it, fill their details, and e-sign. You&apos;ll see the signed copy here.</p>
          {!a.is_test && <SendLinkForm agreementId={a.id as string} defaultEmail={(a.employee_email as string | null) ?? ''} />}
        </div>
      )}

      {signed && (a.contractor_id || a.employee_id) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-6 text-sm text-emerald-800">
          Saved to the workforce area ·{' '}
          <Link href={a.contractor_id ? `/portal/contractors/${a.contractor_id}` : `/portal/employees/${a.employee_id}`} className="font-semibold underline">
            View {a.contractor_id ? 'contractor' : 'employee'} record
          </Link>
        </div>
      )}

      <EmploymentAgreementDocument a={agreementViewFromRow(a)} wrapper="share-page" />
    </div>
  )
}
